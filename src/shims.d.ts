declare module "*.css";

/** The published bundle imports the host's axios. Dev and tests use a local stand-in. */
declare module "axios" {
  const axios: {
    defaults: {
      baseURL?: string;
    };
  };
  export default axios;
}
