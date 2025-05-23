import React from 'react'
import { Head, useForm } from '@inertiajs/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import AuthLayout from '@/layouts/auth_layout'
import useTranslation from '@/hooks/use_translation'

export default function Register() {
  const { t } = useTranslation()
  const { data, setData, post, processing, errors } = useForm({
    firstName: '',
    lastName: '',
    username: '',
    email: '',
    password: '',
    passwordConfirmation: '',
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    post('/register')
  }

  return (
    <AuthLayout>
      <Head title={t('auth.register', {}, 'Đăng ký')} />
      <Card className="mx-auto w-full">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">{t('auth.register_account', {}, 'Đăng ký tài khoản')}</CardTitle>
          <CardDescription className="text-center">
            {t('auth.register_description', {}, 'Nhập thông tin của bạn để tạo tài khoản mới')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <a href="/auth/google/redirect" className="w-full">
                <Button variant="outline" className="w-full flex items-center justify-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-500">
                    <path d="M21.35 11.1H12.18V13.83H18.69C18.36 17.64 15.19 19.27 12.19 19.27C8.36 19.27 5.22 16.25 5.22 12.21C5.22 8.17 8.38 5.16 12.21 5.16C14.38 5.16 16.12 6.34 17.09 7.24L19.07 5.24C17.13 3.43 14.92 2.33 12.21 2.33C6.97 2.33 2.33 7.04 2.33 12.21C2.33 17.38 6.98 22.09 12.22 22.09C17.79 22.09 21.4 17.86 21.4 12.45C21.4 11.83 21.37 11.42 21.35 11.1Z"></path>
                  </svg>
                  {t('auth.register_with_google', {}, 'Đăng ký với Google')}
                </Button>
              </a>
              <a href="/auth/github/redirect" className="w-full">  
                <Button variant="outline" className="w-full flex items-center justify-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path>
                  </svg>
                  {t('auth.register_with_github', {}, 'Đăng ký với GitHub')}
                </Button>
              </a>
            </div>
            
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <Separator className="w-full" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  {t('auth.or_register_with_email', {}, 'Hoặc đăng ký bằng email')}
                </span>
              </div>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">{t('auth.first_name', {}, 'Họ')}</Label>
                  <Input
                    id="firstName"
                    value={data.firstName}
                    onChange={(e) => setData('firstName', e.target.value)}
                    required
                  />
                  {errors.firstName && (
                    <p className="text-sm text-destructive">{errors.firstName}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">{t('auth.last_name', {}, 'Tên')}</Label>
                  <Input
                    id="lastName"
                    value={data.lastName}
                    onChange={(e) => setData('lastName', e.target.value)}
                    required
                  />
                  {errors.lastName && (
                    <p className="text-sm text-destructive">{errors.lastName}</p>
                  )}
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="username">{t('auth.username', {}, 'Tên người dùng')}</Label>
                <Input
                  id="username"
                  value={data.username}
                  onChange={(e) => setData('username', e.target.value)}
                  required
                />
                {errors.username && (
                  <p className="text-sm text-destructive">{errors.username}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  {t('auth.username_requirements', {}, 'Tên người dùng phải là duy nhất và không chứa khoảng trắng')}
                </p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={data.email}
                  onChange={(e) => setData('email', e.target.value)}
                  required
                />
                {errors.email && (
                  <p className="text-sm text-destructive">{errors.email}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password">{t('auth.password', {}, 'Mật khẩu')}</Label>
                <Input
                  id="password"
                  type="password"
                  value={data.password}
                  onChange={(e) => setData('password', e.target.value)}
                  required
                />
                {errors.password && (
                  <p className="text-sm text-destructive">{errors.password}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="passwordConfirmation">{t('auth.confirm_password', {}, 'Xác nhận mật khẩu')}</Label>
                <Input
                  id="passwordConfirmation"
                  type="password"
                  value={data.passwordConfirmation}
                  onChange={(e) => setData('passwordConfirmation', e.target.value)}
                  required
                />
                {errors.passwordConfirmation && (
                  <p className="text-sm text-destructive">{errors.passwordConfirmation}</p>
                )}
              </div>
              
              <Button type="submit" className="w-full" disabled={processing}>
                {processing ? t('auth.processing', {}, 'Đang xử lý...') : t('auth.register', {}, 'Đăng ký')}
              </Button>
            </form>
          </div>
        </CardContent>
        <CardFooter className="flex justify-center">
          <div className="text-center text-sm">
            <a href="/login" className="text-primary hover:underline">
              {t('auth.already_have_account', {}, 'Đã có tài khoản? Đăng nhập')}
            </a>
          </div>
        </CardFooter>
      </Card>
    </AuthLayout>
  )
} 