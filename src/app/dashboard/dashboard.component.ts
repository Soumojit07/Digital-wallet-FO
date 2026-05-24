import { Component, OnInit, OnDestroy, AfterViewInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AuthService } from '../services/auth.service';
import { WalletService } from '../services/wallet.service';
import { BankService } from '../services/bank.service';
import { Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';

declare var Chart: any;

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})

export class DashboardComponent implements OnInit, AfterViewInit, OnDestroy {

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

  private starAnimFrame: number = 0;
  private activityChart: any = null;
  private stars: any[] = [];

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
      accountNumber: ['', [
        Validators.required,
        Validators.minLength(10)
      ]],
      ifscCode: ['', [
        Validators.required,
        Validators.pattern(/^[A-Z]{4}0[A-Z0-9]{6}$/)
      ]],
      balance: [0, [
        Validators.required,
        Validators.min(0)
      ]]
    });
  }

  // =========================================================
  // LIFECYCLE
  // =========================================================

  ngOnInit(): void {

    if (!this.auth.isLoggedIn()) {
      this.router.navigate(['/login']);
      return;
    }

    this.user = this.auth.getUserData();

    this.loadDashboardData();
  }

  ngAfterViewInit(): void {

    setTimeout(() => {

      this.initStarfield();

      this.init3DTilt();

      this.initActivityChart();

    }, 400);
  }

  ngOnDestroy(): void {

    if (this.starAnimFrame) {
      cancelAnimationFrame(this.starAnimFrame);
    }

    if (this.activityChart) {
      this.activityChart.destroy();
    }
  }

  // =========================================================
  // COMMON POPUP METHOD
  // =========================================================

  showPopup(message: string, duration: number = 3000): void {

    this.snackBar.open(message, 'Close', {

      duration: duration,

      horizontalPosition: 'center',

      verticalPosition: 'top',

      panelClass: ['center-snackbar']

    });
  }

  // =========================================================
  // HELPERS
  // =========================================================

  getInitials(): string {

    if (!this.user?.fullName) {
      return '??';
    }

    const parts = this.user.fullName.trim().split(' ');

    const first = parts[0]?.charAt(0) || '';

    const second = parts[1]?.charAt(0) || '';

    return (first + second).toUpperCase();
  }

  getBalanceDisplay(): string {

    if (!this.wallet?.balance && this.wallet?.balance !== 0) {
      return '0.00';
    }

    return Number(this.wallet.balance).toLocaleString('en-IN', {

      minimumFractionDigits: 2,

      maximumFractionDigits: 2

    });
  }

  getTxnIconClass(type: string): string {

    switch (type) {

      case 'WALLET_TO_WALLET':
      case 'WALLET_TO_BANK':
        return 'txn-icon-out';

      case 'BANK_TO_WALLET':
        return 'txn-icon-in';

      case 'MERCHANT_PAYMENT':
        return 'txn-icon-shop';

      default:
        return 'txn-icon-def';
    }
  }

  getTxnAmountClass(type: string): string {

    switch (type) {

      case 'WALLET_TO_WALLET':
      case 'MERCHANT_PAYMENT':
      case 'WALLET_TO_BANK':
        return 'txn-amt-out';

      case 'BANK_TO_WALLET':
        return 'txn-amt-in';

      default:
        return 'txn-amt-def';
    }
  }

  getTransactionSign(type: string): string {

    switch (type) {

      case 'WALLET_TO_WALLET':
      case 'MERCHANT_PAYMENT':
      case 'WALLET_TO_BANK':
        return '-';

      case 'BANK_TO_WALLET':
        return '+';

      default:
        return '';
    }
  }

  formatAmount(amount: number): string {

    if (amount == null || amount === undefined) {
      return '₹0.00';
    }

    return '₹' + amount.toLocaleString('en-IN', {

      minimumFractionDigits: 2,

      maximumFractionDigits: 2

    });
  }

  getTransactionIcon(type: string): string {

    switch (type) {

      case 'WALLET_TO_WALLET':
        return 'send';

      case 'MERCHANT_PAYMENT':
        return 'shopping_cart';

      case 'BANK_TO_WALLET':
        return 'arrow_circle_down';

      case 'WALLET_TO_BANK':
        return 'arrow_circle_up';

      default:
        return 'receipt';
    }
  }

  getTransactionColor(type: string): string {

    switch (type) {

      case 'WALLET_TO_WALLET':
      case 'MERCHANT_PAYMENT':
      case 'WALLET_TO_BANK':
        return '#f43f5e';

      case 'BANK_TO_WALLET':
        return '#10b981';

      default:
        return '#6366f1';
    }
  }

  formatTransactionType(type: string): string {

    return type ? type.replace(/_/g, ' ') : '';
  }

  // =========================================================
  // LOAD DATA
  // =========================================================

  loadDashboardData(): void {

    this.isLoading = true;

    this.walletService.getBalance().subscribe({

      next: (data) => {

        this.wallet = data;

        this.isLoading = false;

        setTimeout(() => {

          this.initStarfield();

          this.init3DTilt();

          this.initActivityChart();

        }, 300);
      },

      error: () => {

        this.showPopup('Failed to load wallet data');

        this.isLoading = false;
      }
    });

    this.walletService.getHistory().subscribe({

      next: (data) => {

        this.transactions = data;
      },

      error: (err) => {

        console.error(err);
      }
    });

    this.bankService.getAccounts().subscribe({

      next: (data) => {

        this.bankAccounts = data;
      },

      error: (err) => {

        console.error(err);
      }
    });
  }

  // =========================================================
  // LOGOUT
  // =========================================================

  logout(): void {

    this.auth.logout();

    this.router.navigate(['/login']);
  }

  // =========================================================
  // SEND MONEY
  // =========================================================

  onSendMoney(): void {

    if (this.sendMoneyForm.invalid) {

      this.showPopup('Please fill in all required fields');

      return;
    }

    this.walletService.sendMoney(this.sendMoneyForm.value).subscribe({

      next: () => {

        this.showPopup('Money sent successfully!');

        this.sendMoneyForm.reset();

        this.loadDashboardData();
      },

      error: (err) => {

        this.showPopup(
          'Failed to send money: ' +
          (err.error?.message || err.message),
          4000
        );
      }
    });
  }

  // =========================================================
  // ADD FUNDS
  // =========================================================

  onAddFunds(): void {

    if (this.addFundsForm.invalid) {

      this.showPopup('Please fill in all fields');

      return;
    }

    this.walletService.addFunds(
      this.addFundsForm.value.bankAccountId,
      this.addFundsForm.value.amount
    ).subscribe({

      next: () => {

        this.showPopup('Funds added successfully!');

        this.addFundsForm.reset();

        this.loadDashboardData();
      },

      error: (err) => {

        this.showPopup(
          'Failed to add funds: ' +
          (err.error?.message || err.message),
          4000
        );
      }
    });
  }

  // =========================================================
  // WITHDRAW FUNDS
  // =========================================================

  onWithdrawFunds(): void {

    if (this.withdrawFundsForm.invalid) {

      this.showPopup('Please fill in all fields');

      return;
    }

    this.walletService.withdrawFunds(
      this.withdrawFundsForm.value.bankAccountId,
      this.withdrawFundsForm.value.amount
    ).subscribe({

      next: () => {

        this.showPopup('Funds withdrawn successfully!');

        this.withdrawFundsForm.reset();

        this.loadDashboardData();
      },

      error: (err) => {

        this.showPopup(
          'Failed to withdraw funds: ' +
          (err.error?.message || err.message),
          4000
        );
      }
    });
  }

  // =========================================================
  // LINK BANK
  // =========================================================

  onLinkBankAccount(): void {

    if (this.linkBankAccountForm.invalid) {

      this.showPopup('Please fill in all fields correctly');

      return;
    }

    this.bankService.linkAccount(
      this.linkBankAccountForm.value
    ).subscribe({

      next: () => {

        this.showPopup('Bank account linked successfully!');

        this.linkBankAccountForm.reset();

        this.loadDashboardData();
      },

      error: (err) => {

        this.showPopup(
          'Failed to link bank account: ' +
          (err.error?.message || err.message),
          4000
        );
      }
    });
  }

  // =========================================================
  // STARFIELD
  // =========================================================

  private initStarfield(): void {

    const canvas = document.getElementById('starfield') as HTMLCanvasElement;

    if (!canvas) return;

    const ctx = canvas.getContext('2d');

    if (!ctx) return;

    const resize = () => {

      canvas.width = window.innerWidth;

      canvas.height = window.innerHeight;
    };

    resize();

    window.addEventListener('resize', resize);

    this.stars = Array.from({ length: 130 }, () => ({

      x: Math.random() * canvas.width,

      y: Math.random() * canvas.height,

      r: Math.random() * 1.4 + 0.2,

      alpha: Math.random(),

      dAlpha: (Math.random() - 0.5) * 0.006,

      vx: (Math.random() - 0.5) * 0.12,

      vy: (Math.random() - 0.5) * 0.12

    }));

    const draw = () => {

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      this.stars.forEach((s: any) => {

        s.alpha = Math.max(
          0.05,
          Math.min(0.9, s.alpha + s.dAlpha)
        );

        if (s.alpha <= 0.05 || s.alpha >= 0.9) {
          s.dAlpha *= -1;
        }

        s.x = (s.x + s.vx + canvas.width) % canvas.width;

        s.y = (s.y + s.vy + canvas.height) % canvas.height;

        ctx.beginPath();

        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);

        ctx.fillStyle = `rgba(180,180,255,${s.alpha})`;

        ctx.fill();
      });

      this.starAnimFrame = requestAnimationFrame(draw);
    };

    draw();
  }

  // =========================================================
  // 3D TILT
  // =========================================================

  private init3DTilt(): void {

    const card = document.getElementById('balanceCard3d');

    if (!card) return;

    card.addEventListener('mousemove', (e: MouseEvent) => {

      const rect = card.getBoundingClientRect();

      const x = (e.clientX - rect.left) / rect.width - 0.5;

      const y = (e.clientY - rect.top) / rect.height - 0.5;

      card.style.transform =
        `perspective(900px)
        rotateX(${-y * 10}deg)
        rotateY(${x * 10}deg)
        scale(1.02)`;
    });

    card.addEventListener('mouseleave', () => {

      card.style.transform = '';
    });
  }

  // =========================================================
  // CHART
  // =========================================================

  private initActivityChart(): void {

    const canvas =
      document.getElementById('activityChart') as HTMLCanvasElement;

    if (!canvas || typeof Chart === 'undefined') {
      return;
    }

    if (this.activityChart) {
      this.activityChart.destroy();
    }

    const ctx = canvas.getContext('2d');

    if (!ctx) return;

    const sentGrad = ctx.createLinearGradient(0, 0, 0, 100);

    sentGrad.addColorStop(0, 'rgba(99,102,241,0.45)');

    sentGrad.addColorStop(1, 'rgba(99,102,241,0)');

    const recvGrad = ctx.createLinearGradient(0, 0, 0, 100);

    recvGrad.addColorStop(0, 'rgba(16,185,129,0.38)');

    recvGrad.addColorStop(1, 'rgba(16,185,129,0)');

    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

    const sent = [0, 0, 0, 0, 0, 0, 0];

    const recv = [0, 0, 0, 0, 0, 0, 0];

    this.activityChart = new Chart(canvas, {

      type: 'line',

      data: {

        labels: days,

        datasets: [

          {
            label: 'Sent',
            data: sent,
            borderColor: '#6366f1',
            backgroundColor: sentGrad,
            fill: true,
            tension: 0.45
          },

          {
            label: 'Received',
            data: recv,
            borderColor: '#10b981',
            backgroundColor: recvGrad,
            fill: true,
            tension: 0.45
          }
        ]
      },

      options: {

        responsive: true,

        maintainAspectRatio: false
      }
    });
  }
}