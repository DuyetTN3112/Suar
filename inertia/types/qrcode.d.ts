declare module 'qrcode' {
  interface QRCodeRenderOptions {
    type?: 'svg' | 'utf8' | 'terminal'
    width?: number
    margin?: number
    color?: {
      dark?: string
      light?: string
    }
  }

  const QRCode: {
    toString(text: string, options?: QRCodeRenderOptions): Promise<string>
  }

  export default QRCode
}
