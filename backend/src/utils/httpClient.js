import axios from "axios";

const httpClient = axios.create({
  timeout: 10000,
  headers: {
    "User-Agent": "Drishya-Monitor/1.0",
  },
});

export default httpClient;
