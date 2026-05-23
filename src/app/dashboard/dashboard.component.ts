import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AuthService } from '../services/auth.service';
import { WalletService } from '../services/wallet.service';
import { BankService } from '../services/bank.service';
import { Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit {
  user: any;
  wallet: any;
  transactions: any[] = [];
  bankAccounts: any[] = [];
  isLoading = true;
  selectedTab = 0;

  sendMoneyForm!: FormGroup;
  addFundsForm!: FormGroup;
  withdrawFundsForm!: FormGroup;
  linkBankAccountForm!: FormGroup;

  get f() { return this.sendMoneyForm.controls; }
  get a() { return this.addFundsForm.controls; }
  get w() { return this.withdrawFundsForm.controls; }
  get b() { return this.linkBankAccountForm.controls; }

  constructor(
    private fb: FormBuilder,
    private auth: AuthService,
    private walletService: WalletService,
    private bankService: BankService,
    private router: Router,
    private snackBar: MatSnackBar
  ) {
    this.sendMoneyForm = this.fb.group({
      targetIdentifier: ['', Validators.required],
      amount: [0, [Validators.required, Validators.min(1)]],
      description: ['']
    });

    this.addFundsForm = this.fb.group({
      bankAccountId: [0, Validators.required],
      amount: [0, [Validators.required, Validators.min(1)]]
    });

    this.withdrawFundsForm = this.fb.group({
      bankAccountId: [0, Validators.required],
      amount: [0, [Validators.required, Validators.min(1)]]
    });

    this.linkBankAccountForm = this.fb.group({
      bankName: ['', Validators.required],
      accountNumber: ['', [Validators.required, Validators.minLength(10)]],
      ifscCode: ['', [Validators.required, Validators.pattern(/^[A-Z]{4}0[A-Z0-9]{6}$/)]],
      balance: [0, [Validators.required, Validators.min(0)]]
    });
  }

  ngOnInit(): void {
    if (!this.auth.isLoggedIn()) {
      this.router.navigate(['/login']);
      return;
    }

    this.user = this.auth.getUserData();
    this.loadDashboardData();
  }

  loadDashboardData(): void {
    this.isLoading = true;
    
    this.walletService.getBalance().subscribe({
      next: (data) => {
        this.wallet = data;
        this.isLoading = false;
      },
      error: (err) => {
        this.snackBar.open('Failed to load wallet data', 'Close', { duration: 3000 });
        this.isLoading = false;
      }
    });

    this.walletService.getHistory().subscribe({
      next: (data) => {
        this.transactions = data;
      },
      error: (err) => {
        console.error('Failed to load transactions', err);
      }
    });

    this.bankService.getAccounts().subscribe({
      next: (data) => {
        this.bankAccounts = data;
      },
      error: (err) => {
        console.error('Failed to load bank accounts', err);
      }
    });
  }

  logout(): void {
    this.auth.logout();
    this.router.navigate(['/login']);
  }

  onSendMoney(): void {
    if (this.sendMoneyForm.invalid) {
      this.snackBar.open('Please fill in all fields', 'Close', { duration: 3000 });
      return;
    }

    this.walletService.sendMoney(this.sendMoneyForm.value).subscribe({
      next: () => {
        this.snackBar.open('Money sent successfully!', 'Close', { duration: 3000 });
        this.sendMoneyForm.reset();
        this.loadDashboardData();
      },
      error: (err) => {
        this.snackBar.open('Failed to send money: ' + (err.error?.message || err.message), 'Close', { duration: 4000 });
      }
    });
  }

  onAddFunds(): void {
    if (this.addFundsForm.invalid) {
      this.snackBar.open('Please fill in all fields', 'Close', { duration: 3000 });
      return;
    }

    this.walletService.addFunds(this.addFundsForm.value.bankAccountId, this.addFundsForm.value.amount).subscribe({
      next: () => {
        this.snackBar.open('Funds added successfully!', 'Close', { duration: 3000 });
        this.addFundsForm.reset();
        this.loadDashboardData();
      },
      error: (err) => {
        this.snackBar.open('Failed to add funds: ' + (err.error?.message || err.message), 'Close', { duration: 4000 });
      }
    });
  }

  onWithdrawFunds(): void {
    if (this.withdrawFundsForm.invalid) {
      this.snackBar.open('Please fill in all fields', 'Close', { duration: 3000 });
      return;
    }

    this.walletService.withdrawFunds(this.withdrawFundsForm.value.bankAccountId, this.withdrawFundsForm.value.amount).subscribe({
      next: () => {
        this.snackBar.open('Funds withdrawn successfully!', 'Close', { duration: 3000 });
        this.withdrawFundsForm.reset();
        this.loadDashboardData();
      },
      error: (err) => {
        this.snackBar.open('Failed to withdraw funds: ' + (err.error?.message || err.message), 'Close', { duration: 4000 });
      }
    });
  }

  onLinkBankAccount(): void {
    if (this.linkBankAccountForm.invalid) {
      this.snackBar.open('Please fill in all fields correctly', 'Close', { duration: 3000 });
      return;
    }

    this.bankService.linkAccount(this.linkBankAccountForm.value).subscribe({
      next: () => {
        this.snackBar.open('Bank account linked successfully!', 'Close', { duration: 3000 });
        this.linkBankAccountForm.reset();
        this.loadDashboardData();
      },
      error: (err) => {
        this.snackBar.open('Failed to link bank account: ' + (err.error?.message || err.message), 'Close', { duration: 4000 });
      }
    });
  }

  formatAmount(amount: number): string {
    return '₹' + amount?.toFixed(2) || '₹0.00';
  }

  getTransactionIcon(type: string): string {
    switch(type) {
      case 'WALLET_TO_WALLET':
        return 'send';
      case 'MERCHANT_PAYMENT':
        return 'shopping_cart';
      case 'BANK_TO_WALLET':
        return 'add_circle';
      case 'WALLET_TO_BANK':
        return 'remove_circle';
      default:
        return 'receipt';
    }
  }

  getTransactionColor(type: string): string {
    switch(type) {
      case 'WALLET_TO_WALLET':
      case 'MERCHANT_PAYMENT':
      case 'WALLET_TO_BANK':
        return '#ef5350';
      case 'BANK_TO_WALLET':
        return '#66bb6a';
      default:
        return '#42a5f5';
    }
  }

  formatTransactionType(type: string): string {
    return type ? type.replace(/_/g, ' ') : '';
  }
}
