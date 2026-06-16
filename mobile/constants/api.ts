import axios from "axios"

const api = axios.create({baseURL: "https://shop-mobile-server.vercel.app/api"})

export default api;

/*import axios from "axios"
import { Platform } from "react-native"

const LOCAL_API_URL = Platform.select({
    android: "http://192.168.130.136:3000/api",
    ios: "http://192.168.130.136:3000/api",
    default:"http://localhost:3000/api"
})

const api = axios.create({baseURL: LOCAL_API_URL})

export default api;*/
