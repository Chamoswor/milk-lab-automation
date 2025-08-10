# Hovedprosjekt: Automatisert Laboratorieplattform

En full-stack IoT- og web-plattform designet for å automatisere laboratorietesting av melkeprøver. Dette depotet inneholder kildekoden for web-applikasjonen, backend-tjenester og automasjonsskript (for Raspberry Pi og server). Filer relatert til Siemens S7-1200 PLC og UR5-robotarmen er ekskludert.

---

## 🎯 Formål

Dette prosjektet er utviklet for å:

-   **Automatisere** manuelle testprosesser for å redusere feil og øke effektiviteten.
-   **Spore** prøver i sanntid, fra produksjonslinje til ferdig analysert resultat.
-   **Visualisere** data gjennom et intuitivt og moderne web-grensesnitt.
-   **Demonstrere** en komplett DevOps-flyt, inkludert CI/CD, secret-håndtering, containerisering og orkestrering med Kubernetes, for potensielle arbeidsgivere.

---

## 🏗️ Teknologistakk

| Lag / Domene | Teknologi(er) | Rolle |
| :--- | :--- | :--- |
| **Frontend** * | **Vue 3** + Vite | Progressiv Web App (PWA) for data-visualisering og kontroll. |
| **Backend** | **Node.js** (Express) | REST-API for forretningslogikk, autentisering og database-kommunikasjon. |
| **Maskinvare-grensesnitt** | **Python** + snap7, XML-RPC | Bro mellom IT- og OT-systemer (PLC/Robot). |
| **Database** | **MySQL 8.0** | Relasjonell datalagring for prøveresultater og brukerdata. |
| **Orkestrering** | **Docker Compose**, **Kubernetes** | Fleksibel distribusjon for utvikling (lokalt) og produksjon (cluster). |
| **Nettverk** | **Nginx**, **Nginx Ingress** | Reverse-proxy for TLS-terminering, routing og lastbalansering. |
| **Automatisering**| **Bash** | Skript for oppsett, konfigurasjon og deployment. |

---

## 🚀 Hurtigstart

### Forutsetninger
-   Et `bash`-kompatibelt skall (f.eks. Linux eller WSL for Windows).
-   En `x86_64` (AMD/Intel) eller `arm64` (f.eks Raspberry Pi) arkitektur.

### Installasjon og Oppsett
Skriptet `init.sh` håndterer alle avhengigheter, konfigurasjoner og hemmeligheter.

```bash
# 1. Klon depotet
git clone https://github.com/chamoswor/milk-lab-automation.git
cd milk-lab-automation

# 2. Gi din bruker eierskap over filene (viktig for Docker-interaksjon)
sudo chown -R $USER .

# 3. Kjør det interaktive oppsett-skriptet
chmod +x init.sh
./init.sh

```

Du vil nå bli presentert for en meny. For førstegangsoppsett, velg ett av disse alternativene:

* **Valg 1:** Initialize with kubectl - Setter opp et lokalt Kubernetes-kluster som kjører container-bilder fra GitHub Container Registry (ghcr.io) tilknyttet dette repoet.

* **Valg 2:** Initialize with Docker - Setter opp alt som trengs for å kjøre prosjektet lokalt med Docker Compose. Ideelt for utvikling

* **Valg 3:** Initialize with both - Setter opp både Kubernetes(1) og Docker Compose(2).

Når skriptet er ferdig, kan du starte applikasjonen.

---

### Kjøre med Kubernetes (Produksjonsmodus)
`init.sh` detekterer automatisk systemarkitekturen din (x86_64 eller arm64) og tilpasser Kubernetes-oppsettet deretter.

#### Arkitektur-spesifikt Oppsett:
* **x86_64:**
    * Skriptet installerer og konfigurerer ingress-nginx for trafikkontroll.
    * Når init.sh er ferdig, må du selv kjøre minikube tunnel i en separat      terminal for å eksponere applikasjonen.

* **arm64:**
    * Skriptet konfigurerer Traefik, den innebygde ingress-løsningen i K3s.
    * K3s eksponerer tjenester automatisk på enhetens egen IP-adresse.

```bash
# 1. Deploy alle applikasjons-ressurser til klyngen
kubectl apply -f k8s/

# 2. Verifiser at alt kjører som forventet
kubectl get pods,svc,ingress --namespace default
```

### Kjøre med Docker Compose (Utviklingsmodus)

```bash
# Start alle tjenester i bakgrunnen
docker compose up -d

# Følg loggene fra alle containere
docker compose logs -f

# Stopp og fjern containerne
docker compose down
```

---

## 🔒 Sikkerhet og Konfigurasjon
### Secret-håndtering

| Secret‑fil            | Beskrivelse                                | Håndtering
| --------------------- | -------------------------------------------|-----------------------------------
| `admin_password`      | Passord for "admin"-brukeren i web-appen.  | Lagres i ./secrets/admin-password
| `db_password`         | Passord for applikasjonens MySQL-bruker.   | Lagres i ./secrets/db-password
| `mysql_root_password` | Root-passord for MySQL-databasen.          | Lagres i ./secrets/mysql-root-password
| `session_secret`      | Nøkkel for signering av bruker-sesjoner.   | Lagres i ./secrets/session-secret

For Kubernetes blir disse filene automatisk konvertert til en `Secret`-ressurs via `migrate_secrets_to_kubectl`.

---

### Miljøvariabler (`.env`)

En `.env-fil` genereres av `init.sh` for å tilpasse containerne til miljøet. Den inneholder blant annet:

* API-endepunkter (`VITE_API_URL`)
* Database-tilkoblingsdetaljer (`DB_HOST`, `DB_USER`)
* Nettverkskonfigurasjon for Docker (`SUBNET`, `faste IP-er`)
* Detaljer for selv-signerte SSL-sertifikater (`NGINX_SERVER_NAME`)

---

## 🖧 Nettverk & tjenester (Compose‑modus)

| Tjeneste      | Container     | Port(er)    | Fast IP     | Avhengigheter     |
| --------------| ------------- | ----------- | ----------- | ----------------- |
| Frontend      | `vue_app`     | 5173        | 172.20.0.20 | backend           |
| Backend       | `node_api`    | 3000        | 172.20.0.30 | mysql             |
| Python-Bridge | `python`      | 4840 / 8000 | 172.20.0.60 | mysql             |
| MySQL         | `mysql_db`    | 3306        | 172.20.0.50 | –                 |
| Nginx         | `nginx_proxy` | 80 / 443    | 172.20.0.40 | frontend, backend |

Subnettet kan tilpasses ved å kjøre `./init.sh`, eller redigere `.env`-filen manuelt.

---

## 🔄 CI/CD - Bygging og Publisering 
Prosjektet inkluderer et push.sh-skript for å automatisere bygging, versjonering og publisering av kode og Docker-bilder. Fungerer som en CI/CD-pipeline som kan kjøres lokalt.

* Alle innstillinger for skriptet konfigureres i en `.env.github`-fil.
* GHCR Personal Access Token krypteres med AES-256-CBC og lagres lokalt som `GHCR_TOKEN.enc`. Første gang du kjører skriptet blir du bedt om å oppgi token og krypteringspassord. Ved senere kjøringer blir du kun bedt om passordet for å dekryptere tokenet.

```bash
# Bygg og publiser et multi-arkitektur image med Docker Buildx.
./push.sh --pkg-buildx

# Bygg multi-arkitektur manuelt: ett image lokalt (amd64) og ett via SSH på en Pi (arm64)
# <pi-context> er navnet på din Docker SSH-kontekst
./push.sh --pkg-multi <pi-context> arm64

# Bare bygg for den lokale arkitekturen
./push.sh --pkg

# Dytte koden til GitHub med en egendefinert commit-melding
./push.sh --git "Refaktorert backend-autentisering"
```
---

## 🔧 Feilsøking og Vedlikehold

### Vanlige problemer

**Port konflikter:**
```bash
# Sjekk hvilke porter som er i bruk
sudo netstat -tulpn | grep :80
sudo netstat -tulpn | grep :443
```

**Docker permissions:**
```bash
# Legg til bruker i docker‑gruppe
sudo usermod -aG docker $USER
newgrp docker
```

**Kubernetes deployment:**
```bash
# Sjekk pod‑status
kubectl describe pods

# Se logger
kubectl logs ‑f deployment/frontend
kubectl logs ‑f deployment/backend
```

---

## 👤 Forfatter

**Kim‑Andrè Myrvold**  
Tidligere Student, Elkraft & Automasjon  
Trondheim, Norge

📧 Email: [kimandre.myrvold@gmail.com](mailto:kimandre.myrvold@gmail.com)  
🐙 GitHub: [@chamoswor](https://github.com/chamoswor)  
💼 LinkedIn: [Kim-Andrè Myrvold](https://www.linkedin.com/in/kim-andre-myrvold)