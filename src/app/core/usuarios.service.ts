import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { API } from './config';
import { mensaje } from './errores';
import { Rol, Usuario } from './models';

@Injectable({ providedIn: 'root' })
export class UsuariosService {
  private http = inject(HttpClient);
  readonly usuarios = signal<Usuario[]>([]);

  async cargar(): Promise<void> {
    this.usuarios.set(await firstValueFrom(this.http.get<Usuario[]>(`${API}/usuarios`)));
  }

  async crear(d: { usuario: string; nombre: string; rol: Rol; password: string }): Promise<string | null> {
    return this.hacer(() => firstValueFrom(this.http.post(`${API}/usuarios`, d)));
  }

  async cambiarPassword(id: number, password: string): Promise<string | null> {
    return this.hacer(() => firstValueFrom(this.http.put(`${API}/usuarios/${id}/password`, { password })));
  }

  async alternarActivo(id: number): Promise<string | null> {
    return this.hacer(() => firstValueFrom(this.http.patch(`${API}/usuarios/${id}/activo`, {})));
  }

  private async hacer(f: () => Promise<unknown>): Promise<string | null> {
    try {
      await f();
      await this.cargar();
      return null;
    } catch (e) {
      return mensaje(e);
    }
  }
}
