import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';
import { AuthService } from './auth.service';
import * as SockJS from 'sockjs-client';
import { Stomp, CompatClient } from '@stomp/stompjs';

@Injectable({
  providedIn: 'root'
})
export class WebsocketService {
  private stompClient: CompatClient | null = null;
  private notificationSubject = new Subject<string>();
  public notifications$ = this.notificationSubject.asObservable();

  constructor(private authService: AuthService) {
    this.authService.currentUser$.subscribe(user => {
      if (user) {
        this.connect(user.username);
      } else {
        this.disconnect();
      }
    });
  }

  private connect(username: string): void {
    if (this.stompClient && this.stompClient.connected) {
      return;
    }

    const socket = new SockJS('http://localhost:8080/ws');
    this.stompClient = Stomp.over(socket);
    this.stompClient.debug = () => {}; // Mute verbose debug logging

    this.stompClient.connect({}, () => {
      this.stompClient?.subscribe(`/user/${username}/queue/notifications`, (message) => {
        if (message.body) {
          this.notificationSubject.next(message.body);
        }
      });
    }, (error: any) => {
      console.error('WebSocket connection error: ', error);
      setTimeout(() => this.connect(username), 5000);
    });
  }

  private disconnect(): void {
    if (this.stompClient) {
      this.stompClient.disconnect();
      this.stompClient = null;
    }
  }
}
