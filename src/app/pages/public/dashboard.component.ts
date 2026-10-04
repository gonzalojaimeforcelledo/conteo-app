import { ChangeDetectionStrategy, Component, DestroyRef, computed, effect, inject, input, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { DataService } from '../../core/data.service';
import { AuthService } from '../../core/auth.service';
import { fmtHora } from '../../core/util';
import { ELECCIONES, Eleccion, eleccionDe } from '../../core/models';

/**
 * RF-07 / RF-08 / RF-09 — Tablero público de solo lectura.
 * Se actualiza solo: evento `storage` entre pestañas + sincronización cada 3 s.
 */
@Component({
  selector: 'app-dashboard',
  imports: [DecimalPipe, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="top">
      <div class="wrap top__in">
        <div class="brand">
          <span class="brand__mark" aria-hidden="true"><i></i><i></i><i></i></span>
          <span>
            <strong>Elecciones Regionales y Municipales 2026</strong>
            <small>Pueblo Nuevo, Chincha e Ica, 4 de octubre</small>
          </span>
        </div>
        <div class="top__right">
          <span class="live" [class.live--on]="data.conectado()" [class.live--off]="!data.conectado()">
            <span class="live__dot" aria-hidden="true"></span>
            <span>{{ data.conectado() ? 'En vivo' : 'Reconectando' }}</span>
            <span class="live__time num">{{ hace() }}</span>
          </span>
          <a class="top__link" [routerLink]="auth.autenticado() ? '/admin' : '/login'">
            {{ auth.autenticado() ? 'Panel' : 'Personal' }}
          </a>
        </div>
      </div>
    </header>

    <section class="hero" aria-labelledby="t-avance">
      <div class="wrap hero__in">
        <nav class="tabs" aria-label="Elección">
          @for (e of elecciones; track e.id) {
            <a class="tab" [class.tab--on]="e.id === sel()" [routerLink]="['/']" [queryParams]="{ eleccion: e.id }"
               [attr.aria-current]="e.id === sel() ? 'page' : null">
              <strong>{{ e.corto }}</strong><span class="tab__lugar">&nbsp;·&nbsp;{{ e.lugar }}</span>
            </a>
          }
        </nav>
        <div class="hero__fig">
          <h1 id="t-avance" class="sr-only">Avance del conteo de actas</h1>
          <p class="hero__pct num"><span>{{ c().porcentajeActas | number: '1.1-1' }}</span><small>%</small></p>
          <p class="hero__lbl">
            de actas contabilizadas.
            <strong class="num">{{ c().actasContabilizadas }} de {{ c().actasEsperadas }}</strong>
            mesas de Pueblo Nuevo.
          </p>
        </div>
        <div class="hero__track" role="progressbar" aria-label="Actas contabilizadas"
             [attr.aria-valuenow]="c().porcentajeActas" aria-valuemin="0" aria-valuemax="100">
          <span class="hero__fill" [style.transform]="'scaleX(' + (c().porcentajeActas / 100) + ')'"></span>
        </div>
        <dl class="hero__stats">
          <div><dt>Observadas</dt><dd class="num">{{ c().actasObservadas }}</dd></div>
          <div><dt>Por verificar</dt><dd class="num">{{ c().actasPendientes }}</dd></div>
          <div><dt>Participación</dt><dd class="num">{{ c().participacion | number: '1.1-1' }}%</dd></div>
        </dl>
      </div>
    </section>

    <main class="wrap main">
      <div class="main__head">
        <h2>Votos por candidato · {{ lugar() }}</h2>
        <p class="muted">Porcentaje sobre votos válidos. Solo suman las actas contabilizadas.</p>
      </div>

      @if (data.sinServidor() && c().resultados.length === 0) {
        <p class="aviso">No se pudo conectar con el servidor de resultados. Reintentando automáticamente…</p>
      } @else if (c().actasContabilizadas === 0) {
        <p class="aviso">Todavía no hay actas contabilizadas. Esta página se actualizará sola a medida que el equipo digite las actas.</p>
      }

      <ol class="race" [style.--n]="c().resultados.length" aria-label="Resultados ordenados de mayor a menor votación">
        @for (r of porOrden(); track r.candidato.id) {
          <li class="row" [style.--pos]="r.posicion" [class.row--lead]="r.posicion === 0 && r.votos > 0"
              [class.row--flash]="flash().has(r.candidato.id)">
            <span class="row__rank num" aria-hidden="true">{{ r.posicion + 1 }}</span>
            <span class="row__pic">
              @if (r.candidato.foto) {
                <img class="row__foto" [src]="r.candidato.foto" [alt]="'Foto de ' + r.candidato.nombresCompletos" width="56" height="56" loading="lazy">
              } @else {
                <span class="row__foto row__ini" aria-hidden="true">{{ iniciales(r.candidato.nombresCompletos) }}</span>
              }
              @if (r.candidato.logo) {
                <img class="row__logo" [src]="r.candidato.logo" [alt]="'Logo de ' + r.candidato.partidoPolitico" width="26" height="26" loading="lazy">
              }
            </span>
            <span class="row__who">
              <strong>{{ r.candidato.nombresCompletos }}</strong>
              <small>{{ r.candidato.partidoPolitico }}</small>
            </span>
            <span class="row__nums">
              <strong class="num">{{ r.porcentaje | number: '1.2-2' }}%</strong>
              <small class="num">{{ r.votos | number }} votos</small>
            </span>
            <span class="row__bar" aria-hidden="true">
              <span [style.transform]="'scaleX(' + escala(r.porcentaje) + ')'"></span>
            </span>
            <span class="sr-only">Puesto {{ r.posicion + 1 }}.</span>
          </li>
        }
      </ol>

      <dl class="totales">
        <div><dt>Votos válidos</dt><dd class="num">{{ c().votosValidos | number }}</dd></div>
        <div><dt>En blanco</dt><dd class="num">{{ c().votosBlanco | number }}</dd></div>
        <div><dt>Nulos o viciados</dt><dd class="num">{{ c().votosNulos | number }}</dd></div>
        <div><dt>Votos emitidos</dt><dd class="num">{{ c().votosEmitidos | number }}</dd></div>
      </dl>

      <p class="legal">
        Conteo paralelo e informativo elaborado con las actas físicas recibidas por el equipo.
        No reemplaza al conteo oficial: los resultados oficiales corresponden a la ONPE y al JNE.
        Última actualización: <span class="num">{{ hora(c().ultimaActualizacion) }}</span>
      </p>
    </main>

    <div class="sr-only" aria-live="polite">{{ anuncio() }}</div>
  `,
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent {
  data = inject(DataService);
  auth = inject(AuthService);

  /** ?eleccion=PROVINCIAL en la URL (enlace compartible). */
  eleccion = input<string>();
  elecciones = ELECCIONES;
  sel = computed<Eleccion>(() => eleccionDe(this.eleccion()));
  lugar = computed(() => ELECCIONES.find((e) => e.id === this.sel())!.lugar);
  c = computed(() => this.data.consolidados[this.sel()]());
  /** Orden estable del DOM (por lista) — la posición visual la da `--pos`, así el reordenamiento se anima. */
  porOrden = computed(() => [...this.c().resultados].sort((a, b) => a.candidato.ordenLista - b.candidato.ordenLista));

  flash = signal<Set<number>>(new Set());
  anuncio = signal('');
  private ahora = signal(Date.now());
  private previo = new Map<number, number>();
  private previoActas = -1;

  hace = computed(() => {
    const u = this.c().ultimaActualizacion;
    if (!u) return 'sin datos';
    const s = Math.max(0, Math.round((this.ahora() - new Date(u).getTime()) / 1000));
    if (s < 60) return `hace ${s} s`;
    if (s < 3600) return `hace ${Math.floor(s / 60)} min`;
    return fmtHora(u);
  });

  constructor() {
    const reloj = setInterval(() => this.ahora.set(Date.now()), 1000);
    inject(DestroyRef).onDestroy(() => clearInterval(reloj));

    // Resalta brevemente las barras que cambiaron y anuncia la novedad a lectores de pantalla.
    effect(() => {
      const c = this.c();
      const cambiados = new Set<number>();
      for (const r of c.resultados) {
        const p = this.previo.get(r.candidato.id);
        if (p !== undefined && p !== r.votos) cambiados.add(r.candidato.id);
        this.previo.set(r.candidato.id, r.votos);
      }
      const lider = c.resultados[0];
      if (lider && this.previoActas >= 0 && this.previoActas !== c.actasContabilizadas) {
        this.anuncio.set(`${c.actasContabilizadas} de ${c.actasEsperadas} actas contabilizadas. Primer lugar: ${lider.candidato.nombresCompletos} con ${lider.porcentaje}%.`);
      }
      this.previoActas = c.actasContabilizadas;
      if (cambiados.size) {
        this.flash.set(cambiados);
        setTimeout(() => this.flash.set(new Set()), 1400);
      }
    });
  }

  /** Ancho de barra = % real sobre votos válidos (sin exagerar diferencias). */
  escala(porcentaje: number): number {
    return Math.min(1, porcentaje / 100);
  }

  hora = fmtHora;

  iniciales(nombre: string): string {
    const p = nombre.split(/\s+/).filter(Boolean);
    return ((p[0]?.[0] ?? '') + (p[p.length > 3 ? 2 : p.length - 1]?.[0] ?? '')).toUpperCase();
  }
}
