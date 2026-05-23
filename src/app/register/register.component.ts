import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService, SignupRequest } from '../services/auth.service';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css']
})
export class RegisterComponent {
  registerForm: FormGroup;
  hidePassword = true;
  isLoading = false;

  constructor(
    private fb: FormBuilder,
    private auth: AuthService,
    private router: Router,
    private snackBar: MatSnackBar
  ) {
    this.registerForm = this.fb.group({
      username: ['', [Validators.required, Validators.minLength(3)]],
      fullName: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email]],
      phoneNumber: ['', [Validators.required, Validators.pattern('^[0-9]{10}$')]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      role: ['ROLE_USER']
    });
  }

  onSubmit(): void {
    if (this.registerForm.invalid) {
      return;
    }
    this.isLoading = true;
    const request: SignupRequest = this.registerForm.value;
    this.auth.register(request).subscribe({
      next: () => {
        this.isLoading = false;
        this.snackBar.open('Registration successful! You can now login.', 'Close', { duration: 3000 });
        this.router.navigate(['/login']);
      },
      error: (err) => {
        this.isLoading = false;
        this.snackBar.open('Registration failed: ' + (err.error?.message || err.message), 'Close', { duration: 4000 });
      }
    });
  }
}
