import axios from "axios";

const useHttps = process.env.REACT_APP_SERVER_HTTPS === "true";
const protocol = useHttps ? "https" : "http";
const serverUrl = `${protocol}://${process.env.REACT_APP_SERVER_HOST}:${process.env.REACT_APP_SERVER_PORT}`;
console.log(`serverUrl: ${serverUrl}`);

const Request = {
  get: async (url) => {
    try {
      const resp = await axios.get(`${serverUrl}${url}`);
      return resp.data;
    } catch (err) {
      throw err;
    }
  },
  post: async (url, body) => {
    try {
      const resp = await axios.post(`${serverUrl}${url}`, body);
      return resp.data;
    } catch (err) {
      throw err;
    }
  },
  url: (url = "") => {
    return `${serverUrl}${url}`;
  },
};

export default Request;
