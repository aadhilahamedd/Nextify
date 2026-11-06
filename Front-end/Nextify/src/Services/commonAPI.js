import axios from "axios";
import { ensureAuthToken, isAuthExpiredMessage, refreshSession } from "../utils/authSession";

const sendRequest = async (httpMethod, url, reqBody, reqHeaders, extra = {}) => {
  const reqConfig = {
    method: httpMethod,
    url,
    headers: reqHeaders,
    ...(extra.timeout ? { timeout: extra.timeout } : {}),
  };
  if (reqBody !== '' && reqBody !== undefined && reqBody !== null) {
    reqConfig.data = reqBody;
  }
  return axios(reqConfig)
    .then((res) => res)
    .catch((err) => {
      if (err.response) return err.response;
      return {
        status: 500,
        data: { message: err.message || 'Network error' },
        error: err.message || 'Network error',
      };
    });
};

const commonAPI = async (httpMethod, url, reqBody, reqHeaders, extra = {}) => {
  const headers = reqHeaders ? { ...reqHeaders } : reqHeaders;
  if (headers?.Authorization) {
    const fresh = await ensureAuthToken();
    if (fresh) headers.Authorization = `Bearer ${fresh}`;
  }

  const response = await sendRequest(httpMethod, url, reqBody, headers, extra);
  const expired = isAuthExpiredMessage(response?.data?.message || response?.error);
  if (response?.status === 401 && expired && !extra._retried && headers?.Authorization) {
    const refreshed = await refreshSession();
    if (refreshed) {
      return commonAPI(
        httpMethod,
        url,
        reqBody,
        { ...headers, Authorization: `Bearer ${refreshed}` },
        { ...extra, _retried: true },
      );
    }
  }
  return response;
};

export default commonAPI;
