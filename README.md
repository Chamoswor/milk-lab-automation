# Hovedprosjekt – Automasjon av lab‑testing av melk

Full‑stack IoT‑ og web‑plattform som automatiserer laboratorietesting av melkprøver. Prosjektet inkluderer ikke filer tilhørende Siemens PLC S7‑1200 og UR5‑Robot. (Kun prosjektfiler tilhørende Raspberry Pi 5).

---

## 🎯 Formål

- **Automatisere** manuelle test‑prosesser og redusere menneskelige feil.
- **Spore** prøver i sanntid fra produksjonslinjen til laboratoriet.
- **Forenkle** dataanalyse gjennom et intuitivt web‑grensesnitt.
- **Demonstrere** full DevOps‑flyt (CI/CD, secrets‑håndtering, containere & Kubernetes) for potensielle arbeidsgivere.

---

## 🏗️ Teknologistakk

| Lag / Domene           | Teknologi(er)                                | Rolle                      |
| ---------------------- | -------------------------------------------- | -------------------------- |
| Frontend               | **Vue 3** + Vite                             | PWA‑grensesnitt            |
| Backend                | **Node.js** (Express)                        | REST‑API & Auth            |
| PLC/Robot              | **Python** + snap7, XML‑RPC                  | Maskinvare‑grensesnitt     |
| Database               | **MySQL 8.0**                                | Relasjonell lagring        |
| Reverse‑proxy          | **Nginx**                                    | TLS, HTTP → gRPC/WS proxy  |
| Orkestrering (lokal)   | **Docker Compose v2**                        | Hurtig‑oppstart på én node |
| Orkestrering (cluster) | **Kubernetes** (k3s/minikube)                | Skalerbar drift            |
| Ingress                | **Nginx Ingress Controller**                 | TLS‑terminering & routing  |

---

## 🚀 Hurtigstart

### Forutsetninger

- Bash‑shell [ Linux / WSL (Ubuntu) ]
- Architecture [x86_64] eller [arm64]

### 1. Klon og init
```bash
git clone https://github.com/chamoswor/milk-lab-automation.git
cd milk-lab-automation
sudo chown -R $USER .

chmod +x init.sh
./init.sh

```

### 2. Velg distribusjonsmodus

#### Option A: Docker Compose (for utvikling)
```bash
# Start stacken
docker compose up -d

# Se logger
docker compose logs -f

# Stopp stacken
docker compose down
```

#### Option B: Kubernetes (produksjon/demo)
```bash
# Krever kubectl og en K8s‑klynge (minikube/k3s/etc.)
./init.sh  # Velg menyvalg 1 for "Full initialization with kubectl"

# Deploy til klynge
kubectl apply -f k8s/

# Se status
kubectl get pods,svc,ingress -n default
```

---

## 🔒 Sikkerhet & hemmeligheter

Hemmelige nøkler lagres som *Docker/Kubernetes Secrets* og leses inn av containere via `*_FILE`‑variabler.

| Secret‑fil            | Beskrivelse                          |
| --------------------- | ------------------------------------ |
| `admin_password`      | Admin‑passord til web‑applikasjonen  |
| `db_password`         | Passord for MySQL‑brukeren til appen |
| `mysql_root_password` | Passord for MySQL‑root               |
| `session_secret`      | Nøkkel som signerer session‑cookies  |

Alle hemmeligheter opprettes interaktivt av `./init.sh`.

---

## 📄 Miljøvariabler (`.env`)

`init.sh` genererer en `.env`‑fil med konfigurasjon for både Docker Compose og Kubernetes:

```env
NODE_ENV=development
VITE_API_URL=https://localhost/api
VITE_WS_URL=ws://localhost
DB_HOST=mysql
DB_USER=user
DB_NAME=mydb
CORS_ORIGIN=https://localhost

# Nettverkskonfigurasjon
SUBNET=172.20.0.0/16
FRONTEND_IP=172.20.0.20
BACKEND_IP=172.20.0.30
NGINX_IP=172.20.0.40
MYSQL_IP=172.20.0.50
PYTHON_IP=172.20.0.60

# SSL‑sertifikat detaljer
NGINX_SERVER_NAME=localhost
SSL_COUNTRY_NAME=NO
SSL_STATE_OR_PROVINCE_NAME=Trondelag
SSL_LOCALITY_NAME=Trondheim
SSL_ORGANIZATION_NAME=Private
```

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

### CI/CD & Registry Integration
Prosjektet inkluderer `push.sh` for automatisert bygging og publisering til GitHub Container Registry (GHCR):

```bash
# Git operasjoner
./push.sh --git                     # Pusher kode til GitHub med auto-commit
./push.sh --git "Custom message"    # Pusher med egen commit-melding

# Docker image bygging og publisering
./push.sh --pkg                     # Bygger og pusher for lokal arkitektur (AMD64/ARM64)

# SSH-basert bygging på remote maskin
./push.sh --pkg-ssh <context> <arch>    # Bygger via Docker SSH context
# Eksempel: ./push.sh --pkg-ssh pi-remote arm64

# Multi-arkitektur deployment
./push.sh --pkg-multi <context> <arch>  # Bygger lokalt + remote, lager manifest
# Eksempel: ./push.sh --pkg-multi pi-remote arm64 (bygger AMD64 lokalt + ARM64 remote)

# Docker Buildx multi-arch (krever buildx)
./push.sh --pkg-buildx              # Bygger AMD64 + ARM64 samtidig med buildx

# Automatisk versjonering basert på VERSION i .env.github
# Støtter kryptert GHCR token lagring med OpenSSL
```

**Sikkerhet:** GHCR Personal Access Token krypteres med AES-256-CBC og lagres lokalt som `GHCR_TOKEN.enc`. Første gang du kjører skriptet blir du bedt om å oppgi token og krypteringspassord.

**Multi-arch workflow:**
1. Lokalt system bygger for sin arkitektur (f.eks. AMD64)
2. SSH context bygger for fjern-arkitektur (f.eks. ARM64 på Raspberry Pi)
3. Docker manifest kombinerer begge images til én tag
4. Resultatet: `ghcr.io/username/service:1.0` støtter både AMD64 og ARM64
```

### Multi‑Architecture Support
- **AMD64**: Bruker Minikube med automatisk tunnel‑setup
- **ARM64**: Bruker K3s for optimal ytelse på Raspberry Pi
- Automatisk arkitektur‑deteksjon i `init.sh`

### Secrets Management
```bash
# Generer nye secrets
./init.sh  # Velg menyvalg 2

# Migrer secrets til Kubernetes
./init.sh  # Velg menyvalg 5
```

### Development Mode
```bash
# Hot‑reload for utvikling (Docker Compose)
npm run dev  # I frontend‑container
npm run dev  # I backend‑container

# Eller bruk development Docker Compose
docker compose ‑f docker‑compose.dev.yml up
```

---

## 🔧 Feilsøking

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

**SSL‑sertifikat problemer:**
```bash
# Regenerer self‑signed sertifikater
./init.sh  # Velg menyvalg 3
```

### Logger
- **Docker Compose**: `docker compose logs ‑f [service]`
- **Kubernetes**: `kubectl logs ‑f deployment/[service]`
- **Minikube tunnel**: `~/minikube‑tunnel.log`

---

## 🔄 Oppdatering & vedlikehold

### Oppdater images
```bash
# Pull nyeste images
docker compose pull

# Eller bygg lokalt
docker compose build --no-cache
```

### Backup
```bash
# Database backup
docker exec mysql_db mysqldump -u root -p mydb > backup.sql

# Secrets backup
tar -czf secrets-backup.tar.gz secrets/
```

### Cleanup
```bash
# Stopp og fjern alle containere
docker compose down -v

# Fjern ubrukte images
docker system prune -a
```

---

## 📊 Overvåking & logging

### Tilgang til tjenester
- **Frontend**: https://localhost
- **Backend API**: https://localhost/api
- **OPC UA Server**: opc.tcp://localhost:4840
- **Python API**: http://localhost:8000

---

## 📝 Lisens

Dette prosjektet er lisensiert under MIT License - se [LICENSE](LICENSE) filen for detaljer.

---

## 👤 Forfatter

**Kim‑Andrè Myrvold**  
Tidligere Student, Elkraft & Automasjon  
Trondheim, Norge

📧 Email: [kimandre.myrvold@gmail.com](mailto:kimandre.myrvold@gmail.com)  
🐙 GitHub: [@chamoswor](https://github.com/chamoswor)  
💼 LinkedIn: [Kim-Andrè Myrvold](https://www.linkedin.com/in/kim-andre-myrvold)


*Dette prosjektet demonstrerer moderne DevOps‑praksis, containerisering, og orkestrering i et realistisk IoT‑scenario.*






