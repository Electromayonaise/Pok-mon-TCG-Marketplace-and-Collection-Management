<div align="center">

<img src="https://capsule-render.vercel.app/api?type=waving&color=0:FFCB05,50:CC0000,100:3B4CCA&height=130&section=header" width="100%" alt="banner" />
<img src="assets/logo/tezg-wordmark.svg" height="120" alt="TEZG" />

<sub><b>TCG — but EZ</b> · Collection Tracker + Local Marketplace for Colombia</sub>

<a href="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/animated/25.gif">
  <img src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/animated/25.gif" width="80" alt="Pikachu" />
</a>

### One accurate, COP-priced view of your Pokémon TCG collection — with a local marketplace growing on top of it.

<img src="https://readme-typing-svg.demolab.com/?font=Fira+Code&weight=600&size=20&pause=1200&color=CC0000&center=true&vCenter=true&width=680&lines=Track+your+collection.;Follow+the+market.;Trade+with+other+Colombian+collectors.;No+more+eBay+%2B+PriceCharting+%2B+Collectr+juggling." alt="typing tagline" />

<br/>

![Status](https://img.shields.io/badge/status-pre--implementation%20%2F%20planning-yellow?style=for-the-badge)
![Region](https://img.shields.io/badge/region-Colombia-8A2BE2?style=for-the-badge)
![Made with BMAD](https://img.shields.io/badge/planned%20with-BMAD%2FWDS-2596BE?style=for-the-badge)

</div>

<br/>

<div align="center">
<img src="https://capsule-render.vercel.app/api?type=rect&color=0:FFCB05,100:3B4CCA&height=3&width=1000" width="100%" alt="divider" />
</div>

<div align="center">
<img src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/poke-ball.png" width="24" valign="middle"/>&nbsp;<img src="assets/logo/title-what-is-tezg.svg" height="34" valign="middle" alt="What is TEZG?"/>
</div>

Colombian Pokémon TCG collectors, buyers, individual sellers, and small businesses today stitch together eBay, PriceCharting, and Collectr — and eat cross‑border shipping and import‑tax costs to do it. Everything else that exists locally is informal WhatsApp/Telegram groups with no structure.

**TEZG** is being designed as **a collection tracker with a local marketplace attached**: one accurate, COP‑priced view of a collector's cards, their market value, and their wishlist — growing, over time, into a real place to buy, sell, and trade directly with other Colombian collectors.

> Collection‑tracking value ships first and stands on its own. Marketplace liquidity — the seller community — is built on top of it. That's a deliberate sequencing decision, not a gap.

<div align="center">

| | | | |
|:---:|:---:|:---:|:---:|
| <img src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/animated/6.gif" width="70"/> | <img src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/animated/9.gif" width="70"/> | <img src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/animated/3.gif" width="70"/> | <img src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/animated/133.gif" width="70"/> |
| **Collection** | **Marketplace** | **Trading** | **Community** |
| Binder-style tracking of what you own, its condition, and its current market value in COP | Peer‑to‑peer listings for individual sellers and verified businesses — no payment gateway in the middle | Direct card‑for‑card trade offers between individual collectors | Built local‑first for Colombia, growing with the people who actually use it |

</div>

<div align="center">
<img src="https://capsule-render.vercel.app/api?type=rect&color=0:3B4CCA,100:FFCB05&height=3&width=1000" width="100%" alt="divider" />
</div>

<div align="center">
<img src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/poke-ball.png" width="24" valign="middle"/>&nbsp;<img src="assets/logo/title-tech-stack.svg" height="34" valign="middle" alt="Planned Tech Stack"/>
</div>

<div align="center">

![Next.js](https://img.shields.io/badge/Next.js-16-black?style=for-the-badge&logo=next.js&logoColor=white)
![tRPC](https://img.shields.io/badge/tRPC-11-2596BE?style=for-the-badge&logo=trpc&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-7-2D3748?style=for-the-badge&logo=prisma&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase%20Postgres-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)
![Better Auth](https://img.shields.io/badge/Better%20Auth-1.x-000000?style=for-the-badge)
![Tailwind CSS](https://img.shields.io/badge/Tailwind%20CSS-4-38B2AC?style=for-the-badge&logo=tailwindcss&logoColor=white)
![Vercel](https://img.shields.io/badge/Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white)

</div>

<div align="center">
<img src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/poke-ball.png" width="24" valign="middle"/>&nbsp;<img src="assets/logo/title-design-principles.svg" height="34" valign="middle" alt="Design Principles"/>
</div>

- **Peer‑to‑peer settlement, no payment gateway** — the platform never holds funds; buyers and sellers confirm payment and receipt between themselves.
- **Module boundaries are real boundaries** — each module (catalog, listings, orders, trading, commission, collection, identity...) owns its own data and exposes a public interface; nothing reaches into another module's internals.
- **Local‑first, COP‑native** — money, dates, and pricing are designed around Colombia from the start, not bolted on later.

<div align="center">
<img src="https://capsule-render.vercel.app/api?type=rect&color=0:CC0000,100:FFCB05&height=3&width=1000" width="100%" alt="divider" />
</div>

<div align="center">

<sub>TCG, but EZ.</sub>

<img src="https://capsule-render.vercel.app/api?type=waving&color=0:3B4CCA,50:CC0000,100:FFCB05&height=120&section=footer&reversed=true" width="100%" alt="footer" />

</div>
