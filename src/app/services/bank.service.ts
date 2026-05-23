import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class BankService {
  private apiUrl = 'http://localhost:8080/api/bank';

  constructor(private http: HttpClient, private authService: AuthService) {}

  linkAccount(accountDetails: any): Observable<any> {
    const headers = {
      ...this.authService.getAuthHeaders(),
      'Content-Type': 'application/json'
    };
    return this.http.post<any>(`${this.apiUrl}/link`, accountDetails, { headers });
  }

  getAccounts(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/accounts`, { headers: this.authService.getAuthHeaders() });
  }

  addFunds(payload: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/add-funds`, payload, { headers: this.authService.getAuthHeaders() });
  }

  withdrawFunds(payload: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/withdraw-funds`, payload, { headers: this.authService.getAuthHeaders() });
  }
}
