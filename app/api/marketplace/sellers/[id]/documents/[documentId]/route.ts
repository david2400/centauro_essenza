import { NextResponse } from 'next/server';
import { unstable_rethrow } from 'next/navigation';

import { auth } from '@/auth';
import { marketplace_repository } from '@/server/domains/marketplace/repository';
import { ServerApiError } from '@/server/lib/types';

/**
 * Descarga de un documento privado de vendedor. El navegador nunca recibe una URL del archivo:
 * este handler exige sesión y reenvía la petición a draco con el token del usuario, que vuelve a
 * validar permiso (VENDEDORES.VER) y empresa, y deja la descarga auditada.
 */
const ALLOWED_TYPES = new Set(['application/pdf', 'image/png', 'image/jpeg']);

export async function GET(request: Request, { params }: { params: Promise<{ id: string; documentId: string }> }) {
  const session = await auth();
  if (!session?.accessToken) {
    return NextResponse.json({ message: 'Sesión requerida' }, { status: 401 });
  }
  const { id, documentId } = await params;
  const sellerId = Number(id);
  const docId = Number(documentId);
  if (!Number.isInteger(sellerId) || sellerId <= 0 || !Number.isInteger(docId) || docId <= 0) {
    return NextResponse.json({ message: 'Documento inválido' }, { status: 400 });
  }
  try {
    const upstream = await marketplace_repository.document_file(sellerId, docId, request.signal);
    const type = (upstream.headers.get('Content-Type') ?? '').split(';')[0]?.trim().toLowerCase() ?? '';
    const headers = new Headers({
      // Solo los tipos que draco acepta; cualquier otro se entrega como binario.
      'Content-Type': ALLOWED_TYPES.has(type) ? type : 'application/octet-stream',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    });
    const disposition = upstream.headers.get('Content-Disposition');
    if (disposition) headers.set('Content-Disposition', disposition);
    const length = upstream.headers.get('Content-Length');
    if (length) headers.set('Content-Length', length);
    return new NextResponse(upstream.body, { status: 200, headers });
  } catch (error) {
    unstable_rethrow(error);
    if (error instanceof ServerApiError) {
      const status = error.status && error.status >= 400 ? error.status : 500;
      return NextResponse.json({ message: status === 403 ? 'Sin permiso' : status === 404 ? 'No encontrado' : 'No se pudo descargar' }, { status });
    }
    return NextResponse.json({ message: 'No se pudo descargar' }, { status: 500 });
  }
}
