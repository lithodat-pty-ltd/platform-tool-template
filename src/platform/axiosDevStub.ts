/**
 * Stand-in for the dev server and unit tests.
 * The published bundle does not use this file. It imports the host's axios,
 * so `axios.defaults.baseURL` is the origin client001 set from `SERVER_API_URL`.
 */
const axios = {
  defaults: {} as { baseURL?: string },
};

export default axios;
