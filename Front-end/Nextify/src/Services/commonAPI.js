import axios from "axios";

const commonAPI = async (httpMethod, url, reqBody, reqHeaders, extra = {}) => {

    const reqConfig = {
        method: httpMethod,
        url: url,
        headers: reqHeaders,
        ...(extra.timeout ? { timeout: extra.timeout } : {}),
    }
    if (reqBody !== '' && reqBody !== undefined && reqBody !== null) {
        reqConfig.data = reqBody
    }
    return await axios(reqConfig)
        .then(res => res)
        .catch(err => {
            if (err.response) {
                return err.response
            }
            return {
                status: 500,
                data: { message: err.message || 'Network error' },
                error: err.message || 'Network error'
            }
        })
}

export default commonAPI;