import { NextRequest, NextResponse } from 'next/server'

const CATEGORIAS = ['Alimentación', 'Transporte', 'Entretenimiento', 'Compras']

export async function POST(req: NextRequest) {
  const { descripcion } = await req.json()

  const desc = descripcion.toLowerCase()

  if (/uber eats|rappi|delivery|restaurante|comida|almuerzo|desayuno|cena|pollo|pizza|sushi|cafe|cafeteria|mercado|supermercado|verdura|fruta|pan|agua|bebida/.test(desc)) {
    return NextResponse.json({ categoria: 'Alimentación' })
  }
  if (/uber|taxi|bus|metro|combustible|gasolina|estacionamiento|pasaje|transporte|moto|bici/.test(desc)) {
    return NextResponse.json({ categoria: 'Transporte' })
  }
  if (/netflix|spotify|cine|juego|videojuego|concierto|teatro|fiesta|bar|discoteca|streaming|youtube|prime|disney/.test(desc)) {
    return NextResponse.json({ categoria: 'Entretenimiento' })
  }

  return NextResponse.json({ categoria: 'Compras' })
}
