import axios from 'axios';

// ★ 10.0.2.2 = Android 에뮬레이터에서 내 PC의 localhost를 가리키는 주소
const axiosInstance = axios.create({
  baseURL: 'http://10.0.2.2:8000',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

export default axiosInstance;
