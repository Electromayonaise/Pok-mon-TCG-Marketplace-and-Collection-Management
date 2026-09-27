---
name: TEZG — es-CO Microcopy Registry (Plan-2)
description: Source of truth for every humanMessage template and UI refusal string across the 12 Plan-2 modules, keyed by DomainError code or DecisionCode. The codes are keys only; they never appear in the UI.
status: final
sources:
  - docs/plan-2/planning/addendum.md (ADD-§1, ADD-§2.7, ADD-§3, ADD-§9)
  - docs/plan-2/ux/EXPERIENCE.md (Voice and Tone)
updated: 2026-09-27
---

# es-CO Microcopy Registry (Plan-2)

**Rules.** EXPERIENCE.md → Voice and Tone governs this file. In brief:

- Every string names **what happened** and **what to do now**.
- Address: *tú* in buyer and seller flows; *usted* in the admin panel and in VER messages to applicants.
- Reapply dates always use `{fecha}` (date **and** time), because the cooldown ends at an exact instant (FR-VER-6): on the day itself, a date alone would promise too early.
- No codes, field names or forbidden phrases (ADD-§1.2). The NFR-SYS-1 CI check runs over this file.
- `{placeholders}` are typed values, formatted per ADD-§2.7:
  - money: `{monto}` → "$45.000 COP"; on-screen figures (`{precio}`, `{valor}`) → "$45.000", without the suffix, as prices are shown elsewhere on screen;
  - dates: `{fecha}` → "29 sep 2026, 3:00 p. m." or `{dia}` → "6 oct 2026";
  - names: `{nombre}`, `{tienda}`.
- **Action** is the label of the one next-step button or link the surface offers. "—" means the banner carries no action.
- The English gloss is for reviewers only and is never shipped.

## 1. Shared and identity (IDN, VER)

| Key | es-CO message | Action | English gloss |
| --- | --- | --- | --- |
| `NotAuthenticated` | "Inicia sesión para continuar. Te traeremos de vuelta a esta página." | Iniciar sesión | Sign in to continue; we'll bring you back here. |
| `AdminOnly` | *(rendered as the Not available page)* "No encontramos esta página en tu cuenta." | Ir al inicio | Page not found in your account. |
| `EmailNotVerified` | "Para comprar, ofertar o escribir a vendedores, primero confirma tu correo. Te enviamos un enlace a {correo}." | Reenviar enlace | Confirm your email first; link sent to {email}. |
| `AuthRateLimited` | "Hubo demasiados intentos de ingreso seguidos. Por seguridad, podrás intentarlo de nuevo a las {hora}." | — | Too many attempts; try again at {time}. |
| `RequestValidationFailed` (summary) | "Revisa {n} campos antes de continuar:" followed by the linked list of field messages. Singular: "Revisa 1 campo antes de continuar:". *Usted* surfaces (5.1, admin): "Revise…". When missing and malformed fields come back together, one summary counts both. | — | Check {n} fields. |
| `MissingRequiredField` (summary) | "Faltan {n} datos obligatorios:" followed by the linked list. Singular: "Falta 1 dato obligatorio:". Used only when every issue is a missing field. | — | {n} required fields are missing. |
| `IndividualSellerProfileIncomplete` | "Antes de publicar, completa tu perfil de vendedor: nombre visible, teléfono de contacto y punto de encuentro. Toma un minuto y guardamos tu publicación mientras tanto." | Completar perfil | Complete your seller profile first; your draft is kept. |
| `IndividualSellerProfileAlreadyComplete` (profile) | "Tu perfil de vendedor ya está completo. Puedes editar tus datos desde Cuenta." | Ir a Cuenta | Profile already complete. |
| `IndividualSellerProfileAlreadyComplete` (VER submit) | "Esta cuenta ya vende como persona, así que no puede registrarse también como tienda. Si quiere vender como tienda, cree una cuenta aparte para su negocio." [ASSUMPTION UX-A-2] | — | This account already sells as an individual; use a separate account for the shop. |
| `AlreadyVerifiedBusiness` (profile) | "Tu cuenta es una tienda verificada, así que no puede vender también como persona. Tus publicaciones se gestionan desde Mi tienda." | Ir a Mi tienda | You're a verified shop; manage listings from My shop. |
| `AlreadyVerifiedBusiness` (VER submit) | "Su tienda ya está verificada; no necesita enviar otra solicitud." | Ver estado | Already verified. |
| `BusinessApplicationOnFile` | "Tienes una solicitud de tienda registrada, así que esta cuenta no puede vender como persona. Revisa el estado de tu solicitud." | Ver solicitud | You have a shop application on file. |
| `SellerNotVerified` (cooldown) | "No puede publicar mientras su solicitud de tienda esté rechazada. Podrá volver a solicitar desde el {fecha}." | Ver solicitud | Can't list while rejected; reapply from {date}. |
| `SellerNotVerified` (barred) | "No puede publicar porque su solicitud de tienda fue rechazada de forma definitiva para esta cuenta." | Ver solicitud | Can't list; rejection is final. |
| `NotBusinessAccount` | "Los mensajes dentro de TEZG son solo para tiendas. Para vendedores individuales, usa «Contactar al vendedor»." | Contactar al vendedor *(when a listing is in context)* | In-app messages are only for shops. |
| `NotBusinessAccount` (FR-MSG-6, became Rejected) | "No enviamos tu mensaje porque {tienda} ya no está disponible para mensajes en TEZG. Guardamos tu texto abajo para que lo copies." | Copiar texto | Not sent: shop no longer available; your text is kept. |
| `ApplicationAlreadyPending` | "Ya tiene una solicitud en revisión. Le avisaremos aquí cuando tengamos una decisión." | Ver estado | Already under review. |
| `ApplicationNotPending` (admin) | "{admin} ya {aprobó / rechazó} esta solicitud el {fecha}. La vista se actualizó con la decisión." | — | Another admin already decided at {date}. |
| `ApplicationNotFound` | *(Not available page)* "No encontramos esta solicitud." | Volver a Solicitudes | Application not found. |
| `ReapplicationCooldownActive` | "Aún no puede volver a solicitar. Podrá hacerlo desde el {fecha}." | — | You can reapply from {date}. |
| `ReapplicationBarred` | "Esta solicitud no se puede volver a enviar: {motivo}. La decisión es definitiva para esta cuenta." | — | Can't resubmit; decision final. |
| `LegalIdentityAccessDenied` | "Los datos legales de una tienda solo se consultan desde la revisión de solicitudes. Este intento quedó registrado." | Ir a Solicitudes *(admins only)* | Legal data only via application review; attempt logged. |
| `RejectionReasonUnknown` | "Ese motivo de rechazo ya no está activo. Elija otro motivo de la lista actualizada." | — | Reason inactive; choose another. |
| `LastActiveReasonRequired` | "Debe quedar al menos un motivo activo. Active otro motivo antes de desactivar este." | — | At least one reason must stay active. |
| `InvalidDocumentFile` (type) | "Este archivo no es un PDF ni una imagen JPG o PNG. Suba su documento en uno de esos formatos." | — | Wrong file type. |
| `InvalidDocumentFile` (size) | "El archivo pesa {peso} MB y el máximo es 5 MB. Suba una versión más liviana del documento." | — | Over 5 MB. |
| `InvalidDocumentFile` (scanner) | "No pudimos aceptar este archivo porque no pasó la revisión de seguridad. Suba otra copia del documento." | — | Failed the security check (AD-SYS-8 rule 6). |
| `InvalidDocumentFile` (missing) | "No recibimos el archivo, o el enlace de subida venció. Vuelva a seleccionar el documento." | — | Upload missing or its link expired (AD-SYS-8 rule 5). |

### 1.1 VER status copy (FR-VER-7, from ADD-§1.3; *usted*)

| Status | Headline | Body |
| --- | --- | --- |
| Pending | "Estamos revisando su tienda" | "Ya puede publicar. Sus publicaciones se verán sin la insignia de verificación y aún no se podrán comprar. Los compradores pueden escribirle dentro de TEZG con un aviso de «tienda aún no verificada»." |
| Approved | "Su tienda está verificada" | "Sus publicaciones ya muestran la insignia de verificación. Recargue su saldo de comisión para empezar a vender." |
| Rejected (cooldown) | "No pudimos verificar su tienda" | "{texto del motivo}. {nota del administrador, si la hay}. Puede volver a solicitar desde el {fecha}." |
| Rejected (barred) | "No pudimos verificar su tienda" | "{texto del motivo}. {nota del administrador, si la hay}. Esta decisión es definitiva para esta cuenta." |

### 1.2 Default rejection-reason texts (ADD-§9.1; editable in 5.5)

| Reason key | es-CO applicant text | Policy |
| --- | --- | --- |
| `DataMismatch` | "Los datos que ingresó no coinciden con sus documentos" | reapply after 7 days |
| `IncompleteDocuments` | "Faltan documentos o no se pueden leer" | reapply now (0 days) |
| `ExternalPresenceUnverifiable` | "No pudimos confirmar la presencia de su tienda en el enlace que compartió" | reapply after 14 days |
| `FraudSuspected` | "La información enviada no permite verificar la tienda de forma segura" | barred |
| `ProhibitedGoods` | "La tienda ofrece productos que TEZG no permite" | barred |

## 2. Catalog and discovery (CAT, DSC)

| Key | es-CO message | Action | English gloss |
| --- | --- | --- | --- |
| `CatalogEntryNotFound` | *(Not available page)* "No encontramos esta carta en el catálogo." | Volver al catálogo | Card not in catalog. |
| `FeedRunInProgress` | "Ya hay una ingesta en curso (iniciada el {fecha}). Espere a que termine para iniciar otra." | Ver ingesta en curso | A run is already in progress. |
| `EventDeliveryNotReplayable` | "Esta entrega ya no está fallida ({estado}), así que no se puede reintentar. La lista se actualizó." | — | Delivery no longer failed; list refreshed (2.3 Entregas tab). |
| `DeliveryAttemptsExhausted` | "Se intentó entregar 3 veces sin confirmación, así que quedó fallida. Puede reintentarla desde esta lista." | Reintentar | Three automatic attempts without a recorded outcome; marked failed (2.3 Entregas tab). |
| `ReferencePriceStale` | "Precio del {dia}: el feed no se actualiza desde entonces." | — | Price from {date}; the feed hasn't updated since. |
| `TrendNoBaseline` | "Sin tendencia: no hay precio de referencia al inicio del período." | — | No trend: no price at period start. |
| `FxRateCarriedForward` | "TRM al {dia} (no hay una TRM publicada para la fecha)." | — | TRM carried forward from {date}. |
| `FxRateSourceMismatch` | "La TRM del {dia} volvió con un valor distinto ({nueva}) al guardado ({guardada}). Conservamos el valor guardado; revise la fuente si el cambio persiste." | — | Source re-sent a different TRM; stored value kept (2.3 TRM tab). |
| No reference price | "Aún no hay precio de referencia." | — | No reference price yet. |
| `InvalidSearchArea` | "Elige un punto dentro de Colombia y una distancia entre 1 y 300 km." | — | Pick a point in Colombia and 1–300 km. |
| `SearchFilterTooBroad` | "Estos filtros incluyen demasiadas cartas para buscar publicaciones. Elige una expansión, un tipo o un nombre para acotar la búsqueda." | — | Filters match too many cards; narrow them. |
| `ListingLocationUnusable` (footer) | "{n} publicaciones no aparecen porque no tienen una ubicación válida." | — | {n} listings hidden: no valid location. |
| Zero results | "Ninguna publicación coincide con estos filtros dentro de {radio} km." | Quitar filtros / Ampliar a {radio×2} km | No listings match. |
| No active listings | "Nadie la está vendiendo ahora. Puedes agregarla a tu lista de deseos." | Agregar a lista de deseos | No active listings. |

### 2.1 Row explanations (FR-DSC-5; typed parts joined by " · ")

| Part | es-CO |
| --- | --- |
| distance | "a {distancia} km" |
| pickup | "recogida en persona" |
| verified | "tienda verificada" |
| purchasable | "se puede comprar" |
| unverified | "tienda sin verificar · aún no se puede comprar" |
| paused | "pausada (la tienda está recargando saldo)" |
| sold out | "agotada" |
| no location | "sin ubicación" |

## 3. Listings and inventory (INV)

| Key | es-CO message | Action | English gloss |
| --- | --- | --- | --- |
| `InvalidItemRef` | "No encontramos esa carta o producto en el catálogo. Búscalo de nuevo y selecciónalo de la lista." | — | Item not found; pick from the list. |
| `InvalidPrice` | "El precio debe ser un valor en pesos entre $1.000 y $100.000.000, sin decimales." | — | Price 1,000–100,000,000 COP. |
| `InvalidLocation` | "El punto de encuentro debe estar en Colombia. Usa tu ubicación o elige tu ciudad." | Usar mi ubicación | Meeting point must be in Colombia. |
| `EmptyComponentList` | "Agrega al menos dos cartas al lote." | — | Add at least two cards. |
| `SealedProductInBundle` | "{producto} es un producto sellado y no puede ir dentro de un lote. Quítalo o publícalo por separado." | Quitar del lote | Sealed product can't be in a bundle. |
| `OpenToTradeNotAllowed` | "Las tiendas venden dentro de TEZG, así que sus publicaciones no se pueden abrir a intercambios." | — | Shops can't open listings to trades. |
| `ListingNotOpenToTrade` | "{nombre} no abrió esta carta a intercambios. Puedes escribirle para comprarla." | Contactar al vendedor | Seller hasn't opened this card to trades. |
| `NotBusinessListing` | "Esta carta la vende una persona, no una tienda, así que se acuerda directamente con {nombre}. Escríbele para comprarla." | Contactar al vendedor | Individual seller: contact to buy. |
| `NotIndividualSellerListing` | "Esta carta la vende una tienda: puedes comprarla aquí mismo o escribirle dentro de TEZG." | Comprar | Shop listing: buy here or message. |
| `InsufficientQuantity` (purchase) | "Solo quedan {disponibles} unidades y pediste {pedidas}. Ajusta la cantidad." / last-unit loser: "Otra persona reservó la última unidad hace un momento. Esta publicación ya no tiene unidades disponibles." | Buscar otra publicación de esta carta | Not enough units / someone took the last one. |
| `InsufficientQuantity` (restock) | "No puedes bajar el inventario por debajo de 0: hay {disponibles} unidades." | — | Stock can't go below 0. |
| `ListingNotFound` | *(Not available page / inline)* "Esta publicación ya no está disponible." | Buscar otra publicación de esta carta | Listing no longer available. |
| Sold out through a sibling (4.2) | "Agotada ({carta} se reservó en otra publicación)" | Reponer | Sibling listing took the shared unit (purchase or accepted trade). |
| `ListingNotOwnedByCaller` | "Solo quien publicó puede cambiar esta publicación." | — | Only the owner can change this listing. |
| `ListingNotPurchasable` + `ListingUnverified` | "Aún no se puede comprar: {tienda} está en proceso de verificación." | Escribir a la tienda | Not purchasable: shop being verified. |
| `ListingNotPurchasable` + `ListingPausedBalanceExhausted` (buyer) | "Pausada: {tienda} está recargando su saldo. Puedes agregarla a tu lista de deseos." | Agregar a lista de deseos | Paused: shop topping up. |
| `ListingPausedBalanceExhausted` (owner) | "Tus publicaciones están pausadas hasta que recargues tu saldo. Siguen visibles y puedes editarlas." | Recargar saldo | Paused until you top up. |
| `ListingUnverified` (owner) | "Sin insignia de verificación · aún no se puede comprar. Se activarán cuando aprobemos tu tienda." | Ver estado de la solicitud | Unbadged; not purchasable until approved. |
| Withdrawn (owner) | "Retirada porque tu solicitud de tienda fue rechazada. No se borró: volverá con sus mismos datos si tu tienda es aprobada." | Ver estado de la solicitud | Withdrawn on rejection; restored on approval. |
| Hidden (owner) | "Oculta por moderación de TEZG: {motivo}. {nota}. Los compradores no la ven." | Contactar a soporte | Hidden by moderation. |
| Reactivate refused (withdrawn/hidden) | "No puedes reactivarla mientras esté {retirada / oculta por moderación}." | — | Can't reactivate while withdrawn/hidden. |
| `ContactRateLimited` | "Enviaste muchos mensajes de contacto seguidos. Podrás contactar a más vendedores a las {hora}." | — | Contact limit; retry at {time}. |

## 4. Orders (ORD)

| Key | es-CO message | Action | English gloss |
| --- | --- | --- | --- |
| `SelfPurchaseNotAllowed` | "Esta publicación es tuya, así que no puedes comprarla." | Ver mis publicaciones | You can't buy your own listing. |
| `TooManyOpenOrders` (per business) | "Ya tienes un pedido sin pagar con {tienda}. Págalo o cancélalo antes de hacer otro." | Ver pedido | One unpaid order with this shop already. |
| `TooManyOpenOrders` (total) | "Tienes 3 pedidos sin pagar. Paga o cancela alguno antes de hacer otro." | Ver pedidos sin pagar | Three unpaid orders already. |
| `ComprobanteInvalidFile` (type) | "Este archivo no es una imagen JPG o PNG ni un PDF. Sube una foto o captura del comprobante." | — | Wrong file type. |
| `ComprobanteInvalidFile` (size) | "El archivo pesa {peso} MB y el máximo es 5 MB. Sube una captura o una foto más liviana." | — | Over 5 MB. |
| `ComprobanteInvalidFile` (scanner) | "No pudimos aceptar este archivo porque no pasó la revisión de seguridad. Sube otra captura del comprobante." | — | Failed the security check (AD-SYS-8 rule 6). |
| `ComprobanteInvalidFile` (missing) | "No recibimos el archivo, o el enlace de subida venció. Vuelve a seleccionar la captura del comprobante." | — | Upload missing or its link expired (AD-SYS-8 rule 5). |
| `ComprobanteLocked` | "Ya confirmaste el pago, así que el comprobante no se puede cambiar. Si hay un problema, escríbele a {tienda}." | Escribir a la tienda | Comprobante locked after payment confirmation. |
| `ComprobanteNotYetUploaded` | "Sube el comprobante de la transferencia antes de confirmar que pagaste." | Subir comprobante | Upload the comprobante first. |
| `ComprobanteMissingOnConfirm` | "Este pedido aún no tiene comprobante. Espera a que el comprador lo suba." | — | No comprobante yet. |
| `OrderAlreadyConfirmedByRole` | "Ya lo habías confirmado el {fecha}. No hay nada más que hacer aquí." | — | Already confirmed at {date}. |
| `OrderConfirmationOutOfOrder` | "Primero confirma que pagaste; después podrás confirmar que recibiste la carta." | Ya pagué | Confirm payment first. |
| `OrderNotVisibleToCaller` | *(Not available page)* "No encontramos este pedido en tu cuenta." | Ver mis pedidos | Order not found in your account. |
| `OrderNotOwnedByCaller` | "Esta acción le corresponde a {la otra parte} del pedido." | — | That action belongs to the other party. |
| `OrderNotCancellable` | "Este pedido ya no se puede cancelar porque {confirmaste el pago / ya estaba cancelado / venció}." | — | Not cancellable. |
| `OrderNoLongerActive` (expired) | "Este pedido venció el {fecha} porque no se confirmó el pago en 48 horas. Si ya transferiste, escríbele a {tienda}; aquí tienes sus datos." | Escribir a la tienda | Order expired; contact the shop if you paid. |
| `OrderNoLongerActive` (cancelled) | "Este pedido se canceló el {fecha}, así que ya no admite confirmaciones." | — | Order was cancelled. |
| Stalled paid order (NFR-ORD-4, ≥7 days) | "Esperando a que {tienda} confirme el pago. Si lleva varios días sin respuesta, escríbele o contacta a soporte de TEZG." | Contactar a soporte | Waiting for shop; contact support. |
| Created | "Paga a {tienda} directamente con los datos de abajo y luego sube tu comprobante. Paga antes del {fecha}." | — | Pay the shop directly, then upload. |
| Status label `AwaitingPayment` | "Por pagar" | — | Awaiting payment. |
| Status label `Paid` | "Pagado" | — | Paid (buyer confirmed). |
| Status label `PaymentConfirmed` | "Pago confirmado" | — | Shop confirmed payment. |
| Status label `Closed` | "Cerrado" | — | Closed (item received). |
| Status label `Cancelled` | "Cancelado" | — | Cancelled. |
| Status label `Expired` | "Vencido" | — | Expired. |
| Business sees buyer-closed order | "{comprador} confirmó que recibió la carta el {fecha}. No habías confirmado el pago; la comisión se cobró igual." | Ver movimiento | Buyer closed before you confirmed. |

## 5. Commission (COM)

| Key | es-CO message | Action | English gloss |
| --- | --- | --- | --- |
| `TopUpAmountInvalid` | "La recarga debe estar entre $20.000 y $10.000.000 COP." | — | Top-up 20,000–10,000,000. |
| `TopUpNotPending` (admin) | "{admin} ya {confirmó / rechazó} esta recarga el {fecha}." | — | Already decided. |
| `TopUpNotVisibleToCaller` | *(Not available page)* "No encontramos esta recarga en tu cuenta." | Ver mis recargas | Not found. |
| `TopUpNotFound` (admin) | *(Not available page)* "No encontramos esta recarga." | Volver a Recargas | Top-up not found. |
| `TopUpProofInvalidFile` (type) | "Este archivo no es una imagen JPG o PNG ni un PDF. Sube una foto o captura del comprobante de la recarga." | — | Wrong file type. |
| `TopUpProofInvalidFile` (size) | "El archivo pesa {peso} MB y el máximo es 5 MB. Sube una captura o una foto más liviana." | — | Over 5 MB. |
| `TopUpProofInvalidFile` (scanner) | "No pudimos aceptar este archivo porque no pasó la revisión de seguridad. Sube otra captura del comprobante." | — | Failed the security check (AD-SYS-8 rule 6). |
| `TopUpProofInvalidFile` (missing) | "No recibimos el archivo, o el enlace de subida venció. Vuelve a seleccionar el comprobante de la recarga." | — | Upload missing or its link expired (AD-SYS-8 rule 5). |
| Top-up pending | "Estamos revisando tu transferencia. Tu saldo cambiará cuando la confirmemos." | — | We're checking your transfer. |
| Top-up confirmed, resumed | "Recibimos tu recarga de {monto}. Tu saldo es {saldo} y tus publicaciones ya se pueden comprar." | — | Received; listings purchasable. |
| Top-up confirmed, still ≤0 | "Recibimos tu recarga de {monto}. Tu saldo es {saldo}; recarga al menos {faltante} para reactivar tus publicaciones." | Recargar saldo | Received; still need {X}. |
| Top-up rejected | "No confirmamos tu recarga de {monto}: {motivo}. Revisa la referencia y envía una nueva solicitud." | Nueva recarga | Top-up rejected: {reason}. |
| Exhausted / negative | "Tus publicaciones están pausadas. Recarga al menos {faltante} para reactivarlas." | Recargar saldo | Paused; top up at least X. |
| Low balance (FR-COM-9) | "Tu saldo se está agotando ({saldo}). Recarga para que tus publicaciones sigan disponibles para compra." | Recargar saldo | Balance running low. |
| Approved, never funded | "Recarga tu saldo para empezar a vender." | Recargar saldo | Top up to start selling. |
| Ledger line, `businessConfirmed` | "Comisión del pedido {pedido} ({tasa} de {base})" | Ver pedido | Commission for order. |
| Ledger line, `buyerClosed` | "Comisión cobrada porque el comprador confirmó que recibió el producto; no habías confirmado el pago." | Contactar a soporte | Charged on buyer close. |
| Top-up sent (live region) | "Recarga enviada. Estamos revisando tu transferencia." | — | Top-up sent. |
| Top-up reference too short | "Escribe al menos 4 caracteres de la referencia de tu transferencia." | — | Reference ≥ 4 characters. |
| Admin confirm dialog (*usted*) | "¿Confirmar la recarga de {monto} para {tienda}?" / "Confirme solo si la transferencia con la referencia {referencia} aparece en el extracto de TEZG." | Confirmar recarga | Confirm top-up? |
| Admin reject reason empty | "Escriba el motivo que verá la tienda." | — | Reason required. |
| Admin decision result | "Recarga confirmada. {tienda} tiene ahora {saldo} y sus publicaciones {se reactivaron / siguen pausadas}." · "Recarga rechazada. {tienda} verá el motivo." | — | Decision outcome. |
| Rate out of range | "La tarifa debe estar entre 0 y 10.000 pb (0 % a 100 %)." | — | Rate 0–10,000 bps. |
| `CommissionRateNotFutureDated` | "La fecha de inicio no puede estar en el pasado. Elija una fecha y hora desde ahora." | — | effectiveFrom ≥ now. |
| Rate scheduled | "Aplica a comisiones que se cobren desde el {fecha}. Los cobros anteriores no cambian." | — | Not retroactive. |
| Reconcile clean | "Todo cuadra: {n} cuentas, 0 diferencias." | — | No discrepancies. |
| Reconcile difference | "El saldo guardado ({saldo}) no coincide con recargas − comisiones ({calculado})." | Ver movimientos | Balance mismatch. |
| Reconcile sequence gap | "Falta el movimiento #{seq} en la secuencia." | Ver movimientos | Sequence gap. |
| Daily reconcile alert (admin header) | "La conciliación encontró {n} diferencias." | Ver conciliación | Daily job found discrepancies. |
| No commission accounts (7.4) | "Aún no hay cuentas de comisión. Se abren cuando se aprueba una tienda." | Programar nueva tarifa | No accounts yet. |

## 6. Trading (TRD)

| Key | es-CO message | Action | English gloss |
| --- | --- | --- | --- |
| `SelfTradeNotAllowed` | "Esta carta es tuya, así que no puedes ofertar por ella." | — | Your own listing. |
| `EmptyTradeOffer` | "Agrega al menos una carta o un monto en pesos a tu oferta." | — | Add a card or cash. |
| `DuplicateOpenOffer` | "Ya tienes una oferta abierta por esta carta. Puedes retirarla o esperar la respuesta de {nombre}." | Ver mi oferta | You already have an open offer. |
| `NotYourTurn` | "Le toca responder a {nombre}. Te avisaremos aquí cuando lo haga." | — | It's {name}'s turn. |
| `TradeOfferNotOpen` (generic) | "Esta oferta ya no está abierta: {estado} el {fecha}." | — | Offer no longer open. |
| `TradeOfferNotOpen` (two tabs) | "Ya aceptaste la oferta de {nombre} en otra pestaña, así que esta no puede continuar." | Ver intercambio aceptado | Accepted in another tab. |
| `ListingNoLongerAvailable` (proposer) | "{nombre} aceptó otra oferta por esta carta, así que esta no puede continuar." | Buscar otra publicación de esta carta | Seller accepted another offer. |
| `TradeRoundLimitReached` | "Llegaron a 10 rondas. Ahora solo puedes aceptar o rechazar." | — | 10 rounds reached. |
| `TradeNotAccepted` | "Solo puedes confirmar el intercambio después de que se acepte la oferta." | — | Confirm only after acceptance. |
| `TradeAlreadyConfirmedByRole` | "Ya confirmaste este intercambio el {fecha}." | — | Already confirmed. |
| `TradeNotCancellable` | "Ya no se puede cancelar: {nombre / tú} ya confirmó que el intercambio se hizo." | — | Can't cancel after a confirmation. |
| `TradeOfferNotVisibleToCaller` | *(Not available page)* "No encontramos esta oferta en tu cuenta." | Ver mis intercambios | Not found. |
| Accepted | "Intercambio aceptado · la carta queda reservada para {nombre}." | — | Accepted; card reserved. |
| One confirmation | "Esperando a que {nombre} confirme." | — | Waiting for {name}. |
| Completed | "Completado: ambos confirmaron el intercambio el {fecha}." | — | Completed. |
| Cancelled | "{nombre / Tú} canceló el intercambio el {fecha}. La carta volvió a estar disponible." | — | Cancelled; card available again. |
| Expired | "Esta oferta venció el {fecha} sin respuesta." | Hacer una nueva oferta | Offer expired. |
| Offer sent (8.2 live region) | "Oferta enviada. Le toca responder a {nombre}. Esta oferta vence el {fecha} si no responde." | — | Offer sent; their turn; absolute expiry. |
| Offer summary (8.1) | "Ofreces: {items} + {efectivo} · Pides: {publicación}" | Enviar oferta | Offer summary. |
| Non-binding line (8.1) | "La oferta no reserva la carta. Si {nombre} no responde, vence el {fecha}." | — | Offer reserves nothing; absolute expiry. |
| Item picker empty search | "No encontramos esa carta en el catálogo. Revisa el nombre o el número." | — | No catalog match. |
| Item limit | "Puedes ofrecer hasta 10 cartas o productos por oferta." | — | 10 items max. |
| Cash out of range | "El efectivo debe estar entre $0 y $10.000.000." | — | Cash 0–10,000,000. |
| Note too long | "La nota puede tener hasta 300 caracteres." | — | Note ≤300. |
| Your turn (badge) | "Te toca responder" | Responder | Your turn. |
| Their turn (badge) | "Le toca a {nombre}" | — | Their turn. |
| Round line: offer | "{nombre} ofreció: {items} + {efectivo}" | — | Round: offer. |
| Round line: counter | "{nombre} contraofertó: {items} + {efectivo}" | — | Round: counter. |
| Changed-term marker | "cambió" | — | Term changed vs previous round. |
| Rejected | "{nombre / Tú} rechazó la oferta el {fecha}." | Hacer una nueva oferta (proposer only) | Rejected. |
| Withdrawn | "{nombre / Tú} retiró la oferta el {fecha}." | — | Withdrawn. |
| Reject dialog | "¿Rechazar la oferta? {nombre} no podrá retomarla; tendrá que hacer una nueva." | Rechazar / Volver | Reject confirm. |
| Counter sent (live region) | "Contraoferta enviada. Le toca responder a {nombre}." | — | Counter sent. |
| `TradeCounterUnchanged` (8.2) | "No cambiaste nada. Si estos términos te sirven, usa «Aceptar»." | — | Counter identical to current terms. |
| Counter editor actions | "Enviar contraoferta" / "Descartar cambios" | — | Send counter / discard. |
| Unfulfillable (seller view) | "Esta oferta quedó sin efecto porque aceptaste otra por la misma carta el {fecha}." | — | Void: you accepted another offer. |
| Withdraw dialog | "¿Retirar tu oferta? {nombre} ya no podrá aceptarla." | Retirar oferta / Seguir con la oferta | Withdraw confirm. |
| Accept — proposer view | "Intercambio aceptado · la carta queda reservada para ti." | — | Accepted; reserved for you. |
| Seller handoff summary | "{nombre} te ofrece {items} + {efectivo} por tu {publicación}." | Copiar resumen | Copyable summary for the seller. |
| Your confirmation | "Confirmaste el {fecha} · Esperando a que {nombre} confirme." | — | You confirmed; waiting. |
| Counterpart confirmed | "{nombre} confirmó que el intercambio se hizo." | Ya hicimos el intercambio | Other party confirmed. |
| Cancel dialog | "¿Cancelar el intercambio? La carta volverá a estar disponible para otras personas." | Cancelar intercambio / Volver | Cancel confirm. |
| Proposer list status | "No disponible" | Buscar otra publicación de esta carta | Unfulfillable, proposer label. |
| Trade list status words (8.3) | "Te toca responder" · "Le toca a {nombre}" · "Aceptado" · "Completado" · "Rechazada" · "Retirada" · "Vencida" · "No disponible" (proposer) / "Sin efecto" (seller) · "Cancelado" | — | Row status labels. |
| Trade list filters (8.3) | "Pendientes" · "Aceptados" · "Completados" · "Terminados"; role toggle "Todas" · "Las que hice" · "Las que recibí" | — | Filters. |
| Empty trade filter | "No hay intercambios en esta lista." | — | Empty filter. |
| Empty trades list | "Todavía no tienes intercambios. Busca cartas abiertas a intercambios en el catálogo." | Explorar el catálogo | No trades yet. |

Composition rule for `{items} + {efectivo}`: items are joined with ", " and a final " y "; when the cash is $0 the " + {efectivo}" segment is dropped; with no items, only "{efectivo}" is shown. Beyond 3 items the list ends with "+{n} cartas más" (§7). `{efectivo}` follows the `{monto}` format ("$20.000 COP") in any text that leaves TEZG (the handoff templates, FR-TRD-6); on-screen summary lines may drop the "COP" suffix, as prices do elsewhere.

## 7. Messaging (MSG)

| Key | es-CO message | Action | English gloss |
| --- | --- | --- | --- |
| `RecipientNotYetVerified` | "Esta tienda aún no ha sido verificada por TEZG." | — | Shop not yet verified. |
| `BusinessCannotInitiate` | "Las tiendas solo pueden responder conversaciones que inicie un comprador." | — | Shops can only reply. |
| `ConversationNotVisibleToCaller` | *(Not available page)* "No encontramos esta conversación en tu cuenta." | Ver mensajes | Not found. |
| Thread read-only (Rejected business) | "Esta conversación es de solo lectura porque la tienda ya no está disponible para mensajes." | — | Read-only. |
| Contact composer (purchase) template | "¡Hola, {vendedor}! Vi tu {producto} ({condición}) en TEZG por {monto}. ¿Todavía está disponible?" | Abrir WhatsApp / Copiar mensaje | Contact template. |
| Trade handoff template | "¡Hola, {vendedor}! Aceptaste mi oferta en TEZG por tu {producto}: te ofrezco {items} + {efectivo}. ¿Cuándo y dónde nos vemos?" | Abrir WhatsApp / Copiar mensaje | Trade handoff template. |
| Truncated overflow | "+{n} cartas más" | — | "+N more items". |
| `ContactRateLimited` (per seller, per day) | "Ya contactaste a {vendedor} varias veces hoy. Podrás volver a escribirle desde el {fecha}." | — | Daily per-seller contact limit; retry from {date}. |
| `RecipientNotYetVerified` (business side) | "Su tienda aún no ha sido verificada: los compradores ven este aviso en sus mensajes." | — | Shown to a Pending shop on its own threads. |
| Contact composer note | "Se abrirá WhatsApp con este mensaje. Puedes editarlo allí antes de enviarlo." | — | Where to edit the text. |
| Contact composer footer | "TEZG no envía este mensaje ni participa en la conversación. El pago y la entrega se acuerdan entre ustedes." | — | TEZG is not a party. |
| Shortened link text (purchase / trade) | "El mensaje para WhatsApp acorta el nombre de la carta. «Copiar mensaje» copia el texto completo." / "El mensaje para WhatsApp acorta los nombres de las cartas. «Copiar mensaje» copia el texto completo." | — | The link text was shortened; the copy is full. |
| Copy feedback (live region) | "Copiado" | — | Copied. |
| Copy failed | "No pudimos copiar. Selecciona el texto del mensaje y cópialo." | — | Clipboard blocked; the text is selected. |
| Inbox chrome (12.2) | Title "Mensajes"; filters "Todas" · "Sin leer" · "Silenciadas" (the last on the buyer side only, FR-MSG-8); row markers "sin verificar" · "solo lectura"; "{n} sin leer"; own-message prefix "Tú: "; "Ver más conversaciones" | — | Inbox labels. |
| Thread header (12.2) | "Tienda en verificación" · "No disponible para mensajes"; context line "Sobre: {producto} · {precio}" | Ver publicación | Header badges and listing context. |
| Composer (12.2) | Placeholder "Escribe un mensaje…"; "Enviar" · "Enviando…" · "Enviado · {hora}" · "No confirmado" | Enviar / Reintentar | Composer states. |
| Composer validation | "Escribe un mensaje." · "El mensaje puede tener hasta 2.000 caracteres." | — | Empty; too long. |
| New message arrival (live region) | Buyer: "{nombre} te escribió · {hora}"; shop: "{nombre} le escribió · {hora}"; pill "Mensajes nuevos ↓" | — | Arrival announcement. |
| Empty inbox | Buyer: "Aún no tienes mensajes. Puedes escribirle a una tienda desde cualquiera de sus publicaciones."; shop: "Aún no tiene mensajes. Los compradores pueden escribirle desde sus publicaciones." | — | No conversations yet. |
| Mute (FR-MSG-8) | "Silenciar conversación" · "Dejar de silenciar"; live region "Silenciaste esta conversación." / "Ya no está silenciada." | — | Mute toggle. |
| Dev console error (12.3) | "No se pudo preparar la mensajería de prueba: {detalle}." | Reintentar | Fixture setup failed. |

## 8. Collections and valuation (COL, VAL)

| Key | es-CO message | Action | English gloss |
| --- | --- | --- | --- |
| `CollectionNotFound` | *(Not available page)* "No encontramos esta colección en tu cuenta." | Ver mis colecciones | Not found. |
| `CollectionNameTaken` | "Ya tienes una colección llamada «{nombre}». Elige otro nombre." | — | Name taken. |
| `CollectionLimitReached` | "Llegaste al máximo de 50 colecciones. Elimina o une alguna para crear otra." | — | 50 collections max. |
| `CollectionEntryNotFound` | "Esta carta ya no está en tu colección. Actualizamos la vista." | — | Entry gone. |
| `InvalidCatalogEntry` | "No encontramos esa carta en el catálogo. Búscala de nuevo por nombre o número." | — | Card not in catalog; search again. |
| `InvalidExternalLink` (url) | "El enlace debe empezar por https:// y tener menos de 2.048 caracteres." | — | https link, ≤2,048. |
| `InvalidExternalLink` (title) | "Escribe un nombre para la carta (hasta 120 caracteres)." | — | Title 1–120. |
| `InvalidExternalLink` (image) | "El enlace de la imagen también debe empezar por https://." | — | Image must be https. |
| `PromptAlreadyResolved` | "Ya {agregaste esta carta a «{colección}» / descartaste esta sugerencia}." | — | Already resolved. |
| `InvalidValuationPeriod` | "Elige un período de 7, 30, 90 o 365 días." | — | Choose 7/30/90/365. |
| `ExternalEntryNotInCatalog` | "Agregada por enlace: no tiene precio de catálogo." | — | Link-added: no catalog price. |
| `NoReferencePrice` | "Aún no hay precio de referencia para esta carta." | — | No reference price. |
| `ValuationNoBaseline` | "Nuevo en este período: no había cartas valoradas al inicio, así que mostramos el cambio en pesos." | — | New this period. |
| Stale item | "◷ Precio del {dia}: el feed no se actualiza desde entonces." | — | Stale. |
| Summary | "Valoradas {n} de {total} · {m} con precio desactualizado" | — | Valued n of total. |
| Trend label | "Lo que valían tus cartas actuales" | — | What your current cards were worth. |
| Prompt | "¿Agregar {producto} a tu colección?" · select label "Colección" · "Agregar" / "Ahora no" | — | Add to collection? |
| Delete collection confirm | "Se eliminará «{nombre}» y sus {n} cartas. Esto no se puede deshacer." | Eliminar colección | Delete collection. |
| Collection created (live region) | "Creaste la colección «{nombre}»." | — | Collection created. |
| Collection deleted (live region) | "Eliminaste «{nombre}»." | — | Collection deleted. |
| No collections (9.1) | "Aún no tienes colecciones. Agrega tu primera carta y la guardaremos en «General»." | Agregar carta | No collections yet. |
| First collection option (9.2) | "General (se creará al guardar)" | — | Default collection, created on first save. |
| Empty collection (9.1) | "Esta colección está vacía. Agrega tu primera carta." | Agregar carta | Empty collection. |
| Set filter, no match (9.1) | "No tienes cartas del set {set} en esta colección." | Quitar filtro | No cards of that set. |
| Source badges | "Comprado en TEZG" · "Agregado a mano" · "Agregado por enlace · {dominio}" | Ver pedido (purchase only) | Bought on TEZG · Added by hand · Added by link. |
| Binder footer | "Página {n} de {total}"; with a one-set filter, adds "· {a}/{b} ({p} %)" | — | Page n of N · completion. |
| Binder sort keys | "Fecha de adquisición" · "Valor" · "Set" · "Número" · "Pokémon" · "Artista" · "Color" · "Manual"; "Ascendente" / "Descendente" | — | Sort keys. |
| Moved / copied (live region) | "Movida a «{colección}»." / "Copiada a «{colección}»." | — | Moved / copied. |
| Manual reorder (live region) | "{carta} movida a la posición {n} de {total}" | — | Reorder narration. |
| Entry added (live region) | "Agregaste {carta} a «{colección}»." | — | Entry added. |
| Add entry — save button | "Agregar a «{colección}»" | — | Add to collection. |
| Link note (9.2) | "TEZG no abre este enlace: solo guardamos el nombre, el enlace y la imagen que indiques." | — | TEZG never opens the link. |
| Catalog card gone (9.2) | "Esta carta ya no está en el catálogo. Búscala de nuevo." | — | Card no longer in catalog. |
| Quantity out of range | "La cantidad debe estar entre 1 y 999." | — | Qty 1–999. |
| Future acquisition date | "La fecha no puede ser posterior a hoy." | — | Date not in the future. |
| Price paid out of range | "El precio debe estar entre $0 y $100.000.000." | — | Price 0–100,000,000. |
| Wishlist separation line | "{n} cartas · Tu lista de deseos no cuenta como parte de tu colección." | — | Wishlist is not the collection. |
| Wishlist sort | "Precio más bajo" · "Más disponibles" · "Agregadas recientemente" | — | Sort options. |
| Wishlist availability | "Desde {precio} · {n} disponibles" / "Sin publicaciones disponibles" / "Sin publicaciones disponibles cerca" | — | Availability line. |
| Within max price | "✓ Dentro de tu precio máximo ({máximo})"; above it: "Tu precio máximo: {máximo}" | — | Within your max price. |
| Wishlist area filter | "Solo cerca de {ciudad} ({n} km)"; no saved area: "Elegir zona" | — | Nearby only. |
| Wishlist nothing nearby | "Ninguna carta de tu lista está a la venta en esta zona." | Quitar filtro de zona | Nothing nearby. |
| Wishlist availability unavailable | "No pudimos cargar la disponibilidad en este momento." | Reintentar | Availability failed. |
| Wishlist removed (live region) | "Quitaste {carta} de tu lista de deseos." | — | Removed from wishlist. |
| Empty wishlist | "Tu lista de deseos está vacía. Agrega cartas desde el catálogo." | Explorar el catálogo | Empty wishlist. |
| Prompt accepted | "Agregaste {producto} a «{colección}»." | Ver en tu colección | Added. |
| Prompt dismissed | "Descartaste la sugerencia de {producto}." | — | Dismissed. |
| Prompt list statuses | "Pendiente" · "Agregada a «{colección}» el {fecha}" · "Descartada el {fecha}"; context "Pedido cerrado el {fecha}" | Ver pedido | Prompt statuses. |
| Prompt collection gone | "No encontramos esta colección en tu cuenta. Elige otra." | — | Collection gone. |
| Empty prompts | "No tienes sugerencias. Aparecen aquí cuando recibes un pedido de una tienda." | — | No prompts. |
| Empty prompt filter | "No hay sugerencias en esta lista." | — | Empty filter. |
| Valuation as-of (10.1) | "Valor al {dia}" | — | Value as of. |
| Valuation period chips | "7 días" · "30 días" · "90 días" · "365 días" | — | Period options. |
| Change, up | "▲ +{p} % en {n} días (desde {valor})" | — | Up p % in n days (from X). |
| Change, down | "▼ −{p} % en {n} días (desde {valor})" | — | Down p % in n days. |
| Change, none | "Sin cambio en {n} días (desde {valor})" | — | No change. |
| Change, no baseline | "+{valor} · Nuevo en este período", followed by the `ValuationNoBaseline` sentence | — | New this period, in pesos. |
| Market-only line | "Solo precios, sin las cartas nuevas: ▲ +{p} % ({valor inicial} → {valor final})" (▼ −{p} % when down) | — | Price-only change. |
| Market-only, no baseline | "Ninguna carta estuvo en tu colección durante todo el período." | — | No card held the whole period. |
| Trend note (10.1) | "Lo que valían tus cartas actuales: si quitas una carta, también sale del cálculo de fechas anteriores." | — | Current cards; removed cards leave past figures too. |
| History heading note (10.2) | "Si quitas una carta, también sale del cálculo de fechas anteriores." | — | Same, under the 10.2 heading. |
| Not-valued disclosure | "No valoradas ({n})"; groups "Agregadas por enlace ({n})" · "Sin precio de referencia ({n})" | — | Not valued, by reason. |
| Nothing valued | "Ninguna carta de esta colección tiene precio de catálogo todavía." | — | No priced cards yet. |
| Per-card breakdown | "Ver detalle por carta"; columns "Carta" · "Cantidad" · "Precio unitario" · "Valor"; filter "Todas" · "Con precio desactualizado ({m})" | — | Breakdown table. |
| Breakdown footer | "Total: {valor} ({n} cartas valoradas)" | — | Total of the rows. |
| USD line | "US${usd} · TRM al {dia}" | — | USD reference, never summed. |
| History links | "Ver historial" (10.1) · "← Valor" (10.2) | — | Links. |
| No collections to value | "Aún no tienes colecciones para valorar." | Agregar carta | Nothing to value. |
| Empty collection (VAL) | "Esta colección está vacía: agrega cartas para ver su valor." | Agregar carta | Empty collection. |
| No history | "Aún no hay historial: ninguna carta de esta colección tiene precio." | — | No history yet. |
| Chart summary | "Valor entre el {inicio} y el {fin}: de {valor inicial} a {valor final}, {cambio}" (`{cambio}` = "+5,69 %" or "Nuevo en este período") | — | Chart summary sentence. |
| Chart legend | "┄┄ Precio sin actualizar" | — | Dashed = stale. |
| Chart point | "{dia} · {valor}"; step: "+{valor} por cartas nuevas ese día"; stale: "◷ Incluye 1 precio sin actualizar desde el {dia}" / "◷ Incluye {n} precios sin actualizar; el más antiguo es del {dia}" | — | Point details. |
| Chart / table toggle | "Ver como tabla" / "Ver como gráfico"; columns "Fecha" · "Valor" · "Cambio" · "Nota" | — | Toggle and columns. |
| History table notes | "Cartas nuevas: {cartas}" (3 names, then "+{n} más") · "Precio sin actualizar: {cartas}" | — | Row notes. |

## 9. Reviews and moderation (REP)

| Key | es-CO message | Action | English gloss |
| --- | --- | --- | --- |
| `TargetNotFound` | "Solo puedes reseñar tiendas verificadas y vendedores con perfil completo." | — | Only verified shops and sellers. |
| `NotVerifiedPurchaser` (paid) | "Podrás reseñar a {tienda} cuando confirmes que recibiste la carta: pagar no es suficiente." | Ver pedido | Confirm receipt first; paying isn't enough. |
| `NotVerifiedPurchaser` (none) | "Para reseñar a {tienda} necesitas una compra suya que hayas recibido." | — | Need a received purchase. |
| `DuplicateReview` | "Ya reseñaste a {nombre}. Puedes editar tu reseña." | Editar mi reseña | Already reviewed; edit instead. |
| `ReviewNotFound` | "Esta reseña ya no está disponible." | — | Not found. |
| Aggregate, business | "De compras verificadas" | — | From verified purchases. |
| Aggregate, individual | "Las reseñas no están ligadas a compras" | — | Not linked to purchases. |
| Count 0 | "Aún no tiene reseñas" | — | No reviews yet. |
| Hidden (author) | "Oculta por moderación de TEZG: {motivo}." | — | Hidden by moderation. |
| Already hidden (admin) | "Ya estaba oculta desde el {fecha} por {admin} ({motivo})." | — | Already hidden. |
| Hide confirm (admin) | "Ocultar la reseña de {autor} sobre {destino}. Dejará de contar en su calificación de inmediato. La autora o el autor verá el motivo." | Ocultar | Hide review. |
| Hide listing confirm (admin) | "Ocultar la publicación «{título}» de {vendedor}. Desaparece de búsquedas y del detalle de inmediato; los pedidos e intercambios ya acordados siguen su curso." | Ocultar | Hide listing. |
| Write heading | "Reseñar a {nombre}" / "Editar tu reseña de {nombre}" | Publicar reseña / Guardar cambios · Cancelar | Review {name} / Edit your review. |
| Provenance note, business | "Tu reseña llevará la marca «Compra verificada»." | — | Your review will carry the verified-purchase mark. |
| Provenance note, individual | "Las reseñas de vendedores no están ligadas a compras: cualquier persona con cuenta puede reseñar a {nombre}." | — | Seller reviews aren't tied to purchases. |
| `NotVerifiedPurchaser` "¿Por qué?" | Paid: "Tu pedido: {estado} desde el {fecha}." · None: "No hay pedidos recibidos de {tienda} en tu cuenta." | — | Your order: {status} since {date}. / No received orders. |
| Rating field | Legend "Calificación"; options "1 estrella" … "5 estrellas"; echo "{n} de 5" | — | Rating. |
| Rating missing | "Elige una calificación de 1 a 5 estrellas." | — | Choose 1–5 stars. |
| Text field | "Tu reseña (opcional)"; counter "{n}/1.000" | — | Your review (optional). |
| Review published / saved | "Publicaste tu reseña de {nombre}." · "Guardaste los cambios de tu reseña." | — | Review published / saved. |
| Review markers | "Compra verificada" · "editada" · "Tu reseña" | — | Verified purchase · edited · your review. |
| Profile actions | "Escribir una reseña" · "Editar tu reseña" · "Inicia sesión para reseñar" · "Ver más reseñas" | — | Write / edit / sign in / more. |
| Profile not available | "No encontramos este perfil." | Ir al catálogo | Profile not found. |
| Admin tabs and search | "Buscar" · "Ocultas ({n})" · "Reseñas" · "Publicaciones" · "Buscar por vendedor o texto" · "Calificación" · "Motivo" | — | Moderation filters. |
| Admin status | "Visible" · "Oculta · {motivo} · por {admin} · {fecha}" · "Sin acciones de moderación" | Ocultar… · Mostrar de nuevo · Ver en el sitio | Item status. |
| Admin hide hints | Review: "La autora o el autor verá el motivo, no la nota." · Listing: "Quien publica verá el motivo y la nota." | — | Who sees what. |
| Admin hide validation | "Elija un motivo." · "Escriba una nota de al menos 10 caracteres para «Otro»." | — | Choose a reason / note ≥10 for Other. |
| Admin hide result | Review: "Ocultó la reseña. La calificación de {destino} ahora es {promedio} · {n} reseñas." (none left: "Ocultó la reseña. {destino} ya no tiene reseñas visibles.") · Listing: "Ocultó la publicación. Ya no aparece en búsquedas ni en el detalle." | — | Hidden; new rating / gone from search. |
| Admin unhide result | "Mostró de nuevo la reseña. La calificación de {destino} ahora es {promedio} · {n} reseñas." · "Mostró de nuevo la publicación." | — | Shown again. |
| Already visible (admin) | "Ya estaba visible: {admin} la mostró de nuevo el {fecha}." | — | Already visible. |
| Content gone (admin) | "Este contenido ya no está disponible." | — | Content no longer available. |
| Audit title and columns | "Auditoría de moderación" · "Cada acción aparece una vez. Los registros no se editan ni se borran." · "Fecha" · "Tipo" · "Acción" ("Ocultó" / "Mostró de nuevo") · "Motivo" · "Contenido" · "Administrador" · "Nota" | Ver en moderación | Moderation audit. |
| Audit empty | "No hay acciones de moderación con estos filtros." | Quitar filtros | No actions for these filters. |

### 9.1 Moderation reasons (ADD-§9.2)

| Key | es-CO label | Applies to |
| --- | --- | --- |
| `Counterfeit` | "Falsificación" | listing |
| `ProhibitedItem` | "Producto no permitido" | listing |
| `MisleadingListing` | "Publicación engañosa" | listing |
| `Harassment` | "Acoso" | review |
| `OffTopic` | "Fuera de tema" | review |
| `PersonalData` | "Datos personales" | both |
| `Spam` | "Spam" | both |
| `Other` | "Otro (requiere nota)" | both; note of 10–500 characters required |

## 10. Transport and system states (all surfaces)

| Situation | es-CO message | Action |
| --- | --- | --- |
| Offline or network loss (load) | "No pudimos cargar {qué} porque se perdió la conexión. Revisa tu conexión y vuelve a intentarlo." | Reintentar |
| Server error or timeout (load) | "No pudimos cargar {qué} en este momento. Ya quedó registrado; vuelve a intentarlo en unos segundos." | Reintentar |
| Command not confirmed (network) | "No sabemos si {acción} se guardó porque se perdió la conexión. Actualiza para ver el estado actual; si no se guardó, puedes repetirla sin riesgo." | Actualizar |
| Slow command (10 s) | "Sigue en proceso…" | — |
| Poll update (polite) | "{nombre} {acción} · {hora}" | — |
| H console banner | "Consola de desarrollo · datos de prueba" | — |
