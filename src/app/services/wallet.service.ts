import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class WalletService {
  private walletUrl = 'http://localhost:8080/api/wallet';
  private transactionUrl = 'http://localhost:8080/api/transaction';

  constructor(private http: HttpClient, private authService: AuthService) {}

  getBalance(): Observable<any> {
    return this.http.get<any>(`${this.walletUrl}/balance`, { headers: this.authService.getAuthHeaders() });
  }

sendMoney(request: any): Observable<any> {
  const headers = {
    ...this.authService.getAuthHeaders(),
    'Content-Type': 'application/json'
  };
  return this.http.post<any>(`${this.transactionUrl}/send`, request, { headers });
}

  updateLimits(request: any): Observable<any> {
    return this.http.put<any>(`${this.walletUrl}/limits`, request, { headers: this.authService.getAuthHeaders() });
  }

  getHistory(): Observable<any[]> {
    return this.http.get<any[]>(`${this.transactionUrl}/history`, { headers: this.authService.getAuthHeaders() });
  }

  addFunds(bankAccountId: number, amount: number): Observable<any> {
    return this.http.post<any>(`${this.transactionUrl}/add-funds`, null, {
      headers: this.authService.getAuthHeaders(),
      params: { bankAccountId: bankAccountId.toString(), amount: amount.toString() }
    });
  }

  withdrawFunds(bankAccountId: number, amount: number): Observable<any> {
    return this.http.post<any>(`${this.transactionUrl}/withdraw-funds`, null, {
      headers: this.authService.getAuthHeaders(),
      params: { bankAccountId: bankAccountId.toString(), amount: amount.toString() }
    });
  }
}
