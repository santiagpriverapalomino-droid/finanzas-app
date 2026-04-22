import { NextResponse } from 'next/server'

const NOTICIAS_FINANCIERAS = [
  {
    fuente: 'SBS Perú',
    titulo: 'Fondos mutuos en Perú: rendimiento promedio de 6.8% en lo que va del año',
    url: 'https://www.sbs.gob.pe',
    tiempo: 'Hoy',
    tipo: 'fondo_mutuo'
  },
  {
    fuente: 'BVL',
    titulo: 'Índice General de la Bolsa de Valores de Lima sube 2.3% impulsado por mineras',
    url: 'https://www.bvl.com.pe',
    tiempo: 'Hoy',
    tipo: 'acciones'
  },
  {
    fuente: 'Bloomberg',
    titulo: 'S&P 500 alcanza nuevos máximos: ¿es momento de invertir en ETFs desde Perú?',
    url: 'https://www.bloomberg.com',
    tiempo: 'Ayer',
    tipo: 'acciones'
  },
  {
    fuente: 'Gestión',
    titulo: 'Depósitos a plazo en soles: bancos peruanos ofrecen hasta 6% anual en 2026',
    url: 'https://gestion.pe',
    tiempo: 'Ayer',
    tipo: 'deposito_plazo'
  },
  {
    fuente: 'CoinDesk',
    titulo: 'Bitcoin supera los $64,000: expertos recomiendan no superar el 10% del portafolio',
    url: 'https://www.coindesk.com',
    tiempo: 'Hace 2 días',
    tipo: 'cripto'
  },
  {
    fuente: 'Credicorp',
    titulo: 'Atlantic Senior: el fondo mutuo conservador con mejor rendimiento del trimestre en Perú',
    url: 'https://www.credicorpcapital.com',
    tiempo: 'Hace 2 días',
    tipo: 'fondo_mutuo'
  },
]

export async function GET() {
  return NextResponse.json({ ok: true, data: NOTICIAS_FINANCIERAS })
}