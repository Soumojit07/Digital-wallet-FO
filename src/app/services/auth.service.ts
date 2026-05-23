import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';

export interface LoginResponse {
  token: string;
  username: string;
  fullName: string;
  role: string;
  upiId: string;
  phoneNumber: string;
}

export interface RegisterResponse {
  token: string;
  username: string;
  fullName: string;
  role: string;
  upiId: string;
  phoneNumber: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface SignupRequest {
  username: string;
  password: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  role?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = 'http://localhost:8080/api';
  private tokenKey = 'auth_token';
  private userKey = 'user_data';

  constructor(private http: HttpClient) {}

  login(username: string, password: string): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.apiUrl}/auth/login`, { username, password }).pipe(
      tap(res => {
        this.setToken(res.token);
        this.setUserData(res);
      }),
      catchError(err => {
        console.error('Login error', err);
        return of(err);
      })
    );
  }

  register(request: SignupRequest): Observable<RegisterResponse> {
    return this.http.post<RegisterResponse>(`${this.apiUrl}/auth/signup`, request).pipe(
      tap(res => {
        this.setToken(res.token);
        this.setUserData(res);
      }),
      catchError(err => {
        console.error('Register error', err);
        return of(err);
      })
    );
  }

  logout(): void {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.userKey);
  }

  isLoggedIn(): boolean {
    return !!localStorage.getItem(this.tokenKey);
  }

  private setToken(token: string): void {
    localStorage.setItem(this.tokenKey, token);
  }

  getToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  private setUserData(user: any): void {
    localStorage.setItem(this.userKey, JSON.stringify(user));
  }

  getUserData(): any {
    const data = localStorage.getItem(this.userKey);
    return data ? JSON.parse(data) : null;
  }

  getAuthHeaders(): { [header: string]: string } {
    const token = this.getToken();
    return token ? { 'Authorization': `Bearer ${token}` } : {};
  }
}
