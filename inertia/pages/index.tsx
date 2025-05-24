import * as React from 'react'
import { Head } from '@inertiajs/react'

export default function Index() {
  React.useEffect(() => {
  }, []);

  return (
    <>
      <Head title="Trang chủ" />
      <div className="p-8">
        <h1 className="text-2xl font-bold">Chào mừng</h1>
        <p className="mt-2">Đây là trang chủ.</p>
      </div>
    </>
  )
}
