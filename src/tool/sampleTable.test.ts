import { describe, expect, it } from "vitest";
import { crc32, sampleTableToXlsx } from "./workbook";
import {
  buildSampleTable,
  formatCitation,
  formatDepth,
  truncateDecimal,
  type SampleRecord,
} from "./sampleTable";

const du1: SampleRecord = {
  id: "1216651",
  name: "Du1-1",
  igsn: "10273/AGUA14E9356",
  latitude: -28.659435,
  longitude: 140.10884,
  elevationMetres: 30.7,
  relativeElevationMin: -374.904,
  relativeElevationMax: -283.464,
  location: "Dunoon 1",
  lithology: "Sandstone",
  mineral: "Apatite",
  sampleKind: "Rock",
  sampleMethod: "Core",
  locationKind: "Borehole/well",
  country: "Australia",
  collectors: ["Dr Angus Nixon (0000-0003-3638-1864)"],
  archive: "Adelaide University",
  coordinatePrecisionMetres: 10,
  elevationKind: "Ground level",
  verticalDatum: "",
  literature: [
    {
      id: "6484951",
      author: "Nixon and A. L. Fernie and N. Glorie and S. Hand & M. Bendell, B.",
      year: "2024",
      journal: "Basin Research",
      volume: "36",
      pages: "e12843",
      doi: "10.1111/bre.12843",
    },
  ],
  analysisCodes: ["FT"],
  packageId: "4532801",
  packageName: "Cooper-Eromanga Basin detrital apatite",
  packageDistribution: "PUBLIC",
  packageWorkflow: "FINISHED",
};

describe("sample table numbers", () => {
  it("truncates the extra digit on latitude the way the sample workbook does", () => {
    expect(truncateDecimal(-28.659435, 5)).toBeCloseTo(-28.65943, 8);
    expect(formatDepth(-374.904, -283.464)).toBe("283.5\u2013374.9");
  });

  it("cites the linked paper as Author et al. (year) journal volume, pages, doi", () => {
    expect(formatCitation(du1.literature[0]!)).toBe(
      "Nixon et al. (2024) Basin Research 36, e12843, doi:10.1111/bre.12843",
    );
  });

  it("builds the Du1-1 row and the footnotes from the sample workbook", () => {
    const table = buildSampleTable([du1], {
      retrievedOn: new Date("2026-09-24T07:01:21Z"),
      origin: "https://app.ausgeochem.org",
    });
    expect(table.filename).toBe("4532801_Samples.xlsx");
    expect(table.rows[0]).toMatchObject({
      sample: "Du1-1",
      igsn: "10273/AGUA14E9356",
      latitude: -28.65943,
      longitude: 140.10884,
      elevation: 31,
      depth: "283.5\u2013374.9",
      location: "Dunoon 1",
    });
    expect(table.footnotes[0]).toContain("Reported coordinate precision is 10 m for every sample.");
    expect(table.footnotes[0]).toContain(
      "Elevations are ground level elevations; EarthBank holds no vertical datum for these samples.",
    );
    expect(table.footnotes[1]).toBe(
      "Identical for every sample in this table and therefore not repeated above: Lithology: Sandstone; Mineral analysed: Apatite; Sample kind: Rock; Sampling method: Core; Location kind: Borehole/well; Country: Australia; Collector: Dr Angus Nixon (0000-0003-3638-1864); Archive: Adelaide University.",
    );
    expect(table.footnotes[2]).toBe("Analyses held in this data package: apatite fission track (AFT), 1 sample.");
    expect(table.footnotes[3]).toBe(
      "Associated reference linked to these samples in EarthBank: Nixon et al. (2024) Basin Research 36, e12843, doi:10.1111/bre.12843.",
    );
    expect(table.footnotes[4]).toBe(
      "Compiled from EarthBank data package 4532801 “Cooper-Eromanga Basin detrital apatite” (public, finished), retrieved 2026-09-24 from https://app.ausgeochem.org. Every value is as held by EarthBank; nothing has been recalculated.",
    );
  });

  it("names every analysis family the samples hold", () => {
    const table = buildSampleTable([{ ...du1, analysisCodes: ["GC", "FT", "UPB"] }], {
      retrievedOn: new Date("2026-09-24T00:00:00Z"),
      origin: "https://app.ausgeochem.org",
    });
    expect(table.footnotes[2]).toBe(
      "Analyses held in this data package: apatite fission track (AFT), 1 sample; U-Pb, 1 sample; geochemistry, 1 sample.",
    );
  });
});

describe("workbook", () => {
  it("uses the CRC-32 check vector", () => {
    expect(crc32(new TextEncoder().encode("123456789"))).toBe(0xcbf43926);
  });

  it("stores an uncompressed Samples sheet with the Du1-1 row", () => {
    const table = buildSampleTable([du1], {
      retrievedOn: new Date("2026-09-24T00:00:00Z"),
      origin: "https://app.ausgeochem.org",
    });
    const bytes = sampleTableToXlsx(table);
    const sheet = storedText(bytes, "xl/worksheets/sheet1.xml");
    expect(sheet).toContain("Table 1 | Sample information");
    expect(sheet).toContain("Du1-1");
    expect(sheet).toContain("<v>-28.65943</v>");
    expect(sheet).toContain("<v>31</v>");
    expect(sheet).toContain("283.5\u2013374.9");
    expect(sheet).toContain('showGridLines="0"');
    expect(storedText(bytes, "xl/workbook.xml")).toContain('name="Samples"');
  });
});

function storedText(zip: Uint8Array, name: string): string {
  const view = new DataView(zip.buffer, zip.byteOffset, zip.byteLength);
  let offset = 0;
  while (offset + 30 <= zip.length && view.getUint32(offset, true) === 0x04034b50) {
    const method = view.getUint16(offset + 8, true);
    const checksum = view.getUint32(offset + 14, true);
    const size = view.getUint32(offset + 18, true);
    const nameLength = view.getUint16(offset + 26, true);
    const extra = view.getUint16(offset + 28, true);
    const fileName = new TextDecoder().decode(zip.subarray(offset + 30, offset + 30 + nameLength));
    const start = offset + 30 + nameLength + extra;
    const data = zip.subarray(start, start + size);
    if (fileName === name) {
      expect(method).toBe(0);
      expect(checksum).toBe(crc32(data));
      return new TextDecoder().decode(data);
    }
    offset = start + size;
  }
  throw new Error(`Missing ${name}`);
}
