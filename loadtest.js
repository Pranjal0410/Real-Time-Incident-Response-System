import http from 'k6/http'
import { check, sleep } from 'k6'

export const options = {
    stages: [
        { duration: '10s', target: 100 },  
        { duration: '20s', target: 400 },  
        { duration: '20s', target: 400 },  
        { duration: '10s', target: 0 },    // ramp down
    ],
    thresholds: {
        http_req_duration: ['p(95)<5000'],  // 5s threshold
        http_req_failed: ['rate<0.01'],
    }
}

export default function () {
    const res = http.get(
        'https://incident-response-system.onrender.com/health'
    )

    check(res, {
        '✅ Status 200': (r) => r.status === 200,
        '⚡ Response < 3s': (r) => r.timings.duration < 3000,
    })

    sleep(1)
}