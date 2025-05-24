import { EventEmitter } from 'node:events';
/**
 * Service để implement Single Flight Pattern, ngăn chặn thundering herd/cache stampede
 * Đảm bảo với một key nhất định, chỉ có một request thực sự được thực thi,
 * các request khác cùng key sẽ chờ và nhận lại kết quả từ request "đại diện"
 */
class SingleFlightService {
    /**
     * Thực thi một hàm callback với key duy nhất
     * Nếu có request cùng key đang chạy, sẽ chờ kết quả thay vì tạo request mới
     *
     * @param key - Khóa duy nhất để xác định request
     * @param callback - Hàm callback để thực thi nếu không có request nào đang chạy với key này
     * @returns Promise với kết quả từ callback
     */
    static async execute(key, callback) {
        // Kiểm tra xem đã có request nào đang chạy với key này chưa
        const existingPromise = this.inFlightRequests.get(key);
        if (existingPromise) {
            // Nếu có, chờ kết quả từ request đang chạy thay vì tạo request mới
            return existingPromise;
        }
        // Nếu không có request nào đang chạy, tạo promise mới
        const promise = callback()
            .then(result => {
            // Khi promise hoàn tất, xóa khỏi registry và emit sự kiện
            this.inFlightRequests.delete(key);
            this.emitter.emit(`complete:${key}`, result);
            return result;
        })
            .catch(error => {
            // Khi promise bị lỗi, xóa khỏi registry và emit sự kiện lỗi
            this.inFlightRequests.delete(key);
            this.emitter.emit(`error:${key}`, error);
            throw error;
        });
        // Lưu promise vào registry
        this.inFlightRequests.set(key, promise);
        return promise;
    }
    /**
     * Kiểm tra xem có request nào đang chạy với key này không
     *
     * @param key - Khóa để kiểm tra
     * @returns true nếu có request đang chạy, false nếu không
     */
    static isInFlight(key) {
        return this.inFlightRequests.has(key);
    }
    /**
     * Lấy số lượng request đang chạy
     *
     * @returns Số lượng request đang chạy
     */
    static getInFlightCount() {
        return this.inFlightRequests.size;
    }
    /**
     * Hủy bỏ tất cả các request đang chạy (chỉ dùng khi cần dọn dẹp)
     */
    static clear() {
        this.inFlightRequests.clear();
        this.emitter.removeAllListeners();
    }
}
// Registry để lưu các request đang xử lý
SingleFlightService.inFlightRequests = new Map();
// EventEmitter để xử lý các sự kiện khi request hoàn tất
SingleFlightService.emitter = new EventEmitter();
export default SingleFlightService;
