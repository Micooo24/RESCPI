import { Platform } from 'react-native'


let baseURL = '';

//LOCALHOST
{Platform.OS == 'android'
? baseURL = 'http://10.16.180.193:5000'
: baseURL = 'http://172.20.10.3:8081'
}


export default baseURL;