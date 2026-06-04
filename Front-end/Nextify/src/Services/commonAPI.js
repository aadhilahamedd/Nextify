import axios from "axios";

const commonAPI = async (httpMethod, url, reqBody,reqHeaders) => {

    const reqConfig = {
        method: httpMethod,
        url: url,
        data: reqBody,
        headers: reqHeaders
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