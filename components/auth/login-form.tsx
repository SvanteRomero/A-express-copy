'use client'

import type React from 'react'

import { useState } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/core/button'
import { Input } from '@/components/ui/core/input'
import { Label } from '@/components/ui/core/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/layout/card'
import { Alert, AlertDescription } from '@/components/ui/feedback/alert'
import { useRouter } from 'next/navigation'

export function LoginForm() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState({ username: '', password: '', form: '' })
  const [isLoading, setIsLoading] = useState(false)
  const { login } = useAuth()
  const router = useRouter()

  const validate = () => {
    const newErrors = { username: '', password: '', form: '' }
    if (!username) {
      newErrors.username = 'Username is required.'
    }
    if (!password) {
      newErrors.password = 'Password is required.'
    }
    setErrors(newErrors)
    return !newErrors.username && !newErrors.password
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) {
      return
    }

    setIsLoading(true)
    setErrors({ username: '', password: '', form: '' })

    const success = await login(username, password)
    if (success) {
      router.push('/dashboard')
    } else {
      setErrors({ ...errors, form: 'Invalid username or password' })
    }
    setIsLoading(false)
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="space-y-1">
        <div className="flex items-center justify-center mb-4">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-red-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">A+</span>
            </div>
            <span className="text-xl font-bold">A+ Express</span>
          </div>
        </div>
        <CardTitle className="text-2xl text-center">Sign in</CardTitle>
        <CardDescription className="text-center">Enter your credentials to access the system</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              type="text"
              placeholder="e.g. john.doe"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
            {errors.username && <p className="text-sm text-red-500">{errors.username}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            {errors.password && <p className="text-sm text-red-500">{errors.password}</p>}
          </div>
          {errors.form && (
            <Alert variant="destructive">
              <AlertDescription>{errors.form}</AlertDescription>
            </Alert>
          )}
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? 'Signing in...' : 'Sign in'}
          </Button>
        </form>

      </CardContent>
    </Card>
  )
}
