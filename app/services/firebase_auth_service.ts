import firebaseConfig from '#config/firebase'
import { initializeApp } from 'firebase/app'
import {
  getAuth,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  PhoneAuthProvider,
  signInWithCredential,
} from 'firebase/auth'
import Redis from '@adonisjs/redis/services/main'

/**
 * Service quản lý xác thực Firebase cho số điện thoại
 */
export default class FirebaseAuthService {
  /**
   * Khởi tạo Firebase app
   */
  private static initializeFirebase() {
    const app = initializeApp(firebaseConfig)
    return getAuth(app)
  }

  /**
   * Lưu thông tin verification ID vào Redis cache
   */
  private static async storeVerificationId(userId: number, verificationId: string, ttl = 300) {
    await Redis.set(`phone_verification:${userId}`, verificationId, 'EX', ttl)
  }

  /**
   * Lấy verification ID từ Redis cache
   */
  private static async getVerificationId(userId: number): Promise<string | null> {
    return await Redis.get(`phone_verification:${userId}`)
  }

  /**
   * Xóa verification ID khỏi Redis cache
   */
  private static async removeVerificationId(userId: number) {
    await Redis.del(`phone_verification:${userId}`)
  }

  /**
   * Gửi mã OTP đến số điện thoại
   */
  public static async sendOTP(
    phoneNumber: string,
    userId: number,
    recaptchaToken: string
  ): Promise<{ status: 'success' | 'error'; message: string }> {
    try {
      const auth = this.initializeFirebase()
      // Tạo RecaptchaVerifier với token từ client
      const appVerifier = new RecaptchaVerifier(auth, recaptchaToken, {})

      // Gửi mã xác thực đến số điện thoại
      const confirmationResult = await signInWithPhoneNumber(auth, phoneNumber, appVerifier)

      // Lưu verification ID vào Redis cache
      await this.storeVerificationId(userId, confirmationResult.verificationId)

      return {
        status: 'success',
        message: 'Mã OTP đã được gửi đến số điện thoại của bạn',
      }
    } catch (error: any) {
      console.error('Firebase Auth Error:', error)
      return {
        status: 'error',
        message: error.message || 'Có lỗi xảy ra khi gửi mã OTP',
      }
    }
  }

  /**
   * Xác minh mã OTP
   */
  public static async verifyOTP(
    userId: number,
    otp: string
  ): Promise<{ status: 'success' | 'error'; message: string }> {
    try {
      const auth = this.initializeFirebase()

      // Lấy verification ID từ Redis cache
      const verificationId = await this.getVerificationId(userId)

      if (!verificationId) {
        return {
          status: 'error',
          message: 'Phiên xác thực đã hết hạn, vui lòng thử lại',
        }
      }

      // Tạo credential từ verification ID và mã OTP
      const credential = PhoneAuthProvider.credential(verificationId, otp)

      // Xác thực với Firebase
      await signInWithCredential(auth, credential)

      // Xóa verification ID khỏi Redis cache sau khi xác thực thành công
      await this.removeVerificationId(userId)

      return {
        status: 'success',
        message: 'Xác minh số điện thoại thành công',
      }
    } catch (error: any) {
      console.error('Firebase Auth Error:', error)

      // Xóa verification ID khỏi Redis cache nếu mã OTP không hợp lệ
      await this.removeVerificationId(userId)

      return {
        status: 'error',
        message: error.message || 'Mã OTP không hợp lệ',
      }
    }
  }
}
