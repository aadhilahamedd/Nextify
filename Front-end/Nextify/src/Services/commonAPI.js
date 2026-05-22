import axios from "axios";

const commonAPI = async (httpMethod, url, reqBody,reqHeaders) => {

    const reqConfig = {
        method: httpMethod,
        url: url,
        data: reqBody,
        headers:reqHeaders
    }
    return await axios(reqConfig).then(res => {
        return res
    }).catch(err => {
        return err
    })
}

export default commonAPI;