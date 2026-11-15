// `/perfil/<userId>` (page 11.2, the seller reputation profile; Story 13.5, decision log Impl-2 #18). Public: rendered
// on the server from `reputation.profile` (S-FR-REP-7) with no session needed. The average, the count and the page of
// reviews come from one snapshot (AD-REP-2 rule 2), so the summary and the list never disagree; a hidden review is
// neither listed nor counted, and leaves no gap. `?pagina=` reads the next 20. An id that is no public seller profile
// (a buyer, an unverified shop, an unknown or malformed id) gets the one Not-available page.
import { headers } from 'next/headers.js';
import type { GetProfileResponse, ProfileReviewDTO } from '../../../src/modules/reviews/index.js';
import { callProcedure } from '../../_server/runtime.js';
import { averageLabel, countLabel, profilePage, provenanceLabel, reviewDate, stars, starsOfTenths } from '../profile.js';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Reputación del vendedor · TEZG' };

type Props = { params: Promise<{ userId: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

function ReviewCard({ review }: { review: ProfileReviewDTO }) {
  const markers = [reviewDate(review.createdAt), ...(review.purchaseVerified ? ['Compra verificada'] : []), ...(review.editedAt ? ['editada'] : [])];
  return (
    <li className="card" aria-label={`${review.rating} de 5`}>
      <p><span aria-hidden="true">{stars(review.rating)}</span> {review.rating} de 5</p>
      {review.text.trim() !== '' && <p>{review.text}</p>}
      <p className="meta">{markers.join(' · ')}</p>
    </li>
  );
}

export default async function SellerProfilePage({ params, searchParams }: Props) {
  const { userId } = await params;
  const page = profilePage((await searchParams).pagina);
  const profile = await callProcedure<GetProfileResponse>('reputation.profile', { userId, page }, await headers());
  if (!profile.ok) {
    const notFound = profile.error.code === 'TargetNotFound' || profile.error.code === 'RequestValidationFailed';
    return (
      <section aria-labelledby="profile-title">
        <h1 id="profile-title">Reputación del vendedor</h1>
        <div className={notFound ? 'xb inert' : 'xb refusal'} role="alert">
          <p>{notFound ? 'No encontramos este perfil.' : 'No pudimos cargar las reseñas en este momento. Ya quedó registrado; vuelve a intentarlo en unos segundos.'}</p>
          <p><a className="btn btn-secondary" href="/">Ir al catálogo</a></p>
        </div>
      </section>
    );
  }
  const { seller, aggregate, reviews, hasMore } = profile.data;
  const name = seller.displayName ?? (seller.kind === 'business' ? 'Tienda' : 'Vendedor');
  return (
    <section aria-labelledby="profile-title">
      <section aria-label="Vendedor">
        <h1 id="profile-title">{name}</h1>
        <p className="meta">{seller.kind === 'business' ? <span className="si confirmed">tienda verificada</span> : 'Vendedor individual'}</p>
      </section>
      <section aria-label="Calificación">
        {aggregate.averageTenths === null
          ? <p>Aún no tiene reseñas</p>
          : (
            <>
              {/* A paragraph may not be named (ARIA 1.2), so the average and its stars are one image named "4,5 de 5". */}
              <p>
                <span role="img" aria-label={`${averageLabel(aggregate.averageTenths)} de 5`}>
                  <span className="price">{averageLabel(aggregate.averageTenths)}</span> <span aria-hidden="true">{starsOfTenths(aggregate.averageTenths)}</span>
                </span>
              </p>
              <p className="meta">{countLabel(aggregate.count)} · {provenanceLabel(seller.kind)}</p>
            </>
          )}
        {aggregate.averageTenths === null && <p className="meta">{provenanceLabel(seller.kind)}</p>}
      </section>
      {reviews.length > 0 && (
        <ol aria-label="Reseñas" style={{ listStyle: 'none', padding: 0, marginTop: 24 }}>
          {reviews.map((r) => <ReviewCard key={r.reviewId} review={r} />)}
        </ol>
      )}
      <p className="row">
        {page > 1 && <a className="btn btn-secondary" href={page === 2 ? `/perfil/${userId}` : `/perfil/${userId}?pagina=${page - 1}`}>Reseñas más recientes</a>}
        {hasMore && <a className="btn btn-secondary" href={`/perfil/${userId}?pagina=${page + 1}`}>Ver más reseñas</a>}
      </p>
    </section>
  );
}
