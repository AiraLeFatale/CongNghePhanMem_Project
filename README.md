# CongNghePhanMem_Project

# Multilingual Automatic Narration System

## 1. System overview (component diagram)

```mermaid
flowchart TB
    QR["QR codes<br/>Bus stops"]
    MOBILE["Mobile app<br/>Geofence, QR, playback"]
    CMS["CMS web<br/>Admin content tools"]
    BACKEND["Backend API<br/>Content, sync, analytics"]
    EXT["External APIs<br/>Translate, TTS"]
    DB[("Database<br/>POIs, users, logs")]
    FS[("File storage<br/>Audio files")]

    QR -.-> MOBILE
    MOBILE <--> BACKEND
    CMS --> BACKEND
    BACKEND --> EXT
    BACKEND --> DB
    BACKEND --> FS
```

## 2. Inside the Mobile app

```mermaid
flowchart LR
    subgraph MOBILE["Mobile app"]
        LOC["Location service<br/>Background GPS"]
        QR["QR scanner<br/>Camera"]
        GEO["Geofence engine<br/>Radius, priority"]
        NAR["Narration engine<br/>TTS, audio queue"]
        UI["UI/UX<br/>Map and settings"]
        CONTENT[("Content layer<br/>SQLite, offline")]
    end
    API["Backend API<br/>Sync POIs, audio"]

    LOC --> GEO
    GEO --> NAR
    QR --> NAR
    CONTENT --> GEO
    CONTENT --> UI
    CONTENT --> NAR
    CONTENT <--> API
```

## 3. Inside the Backend (3-layer)

```mermaid
flowchart TB
    MOBILE["Mobile app<br/>Geofence, QR, playback"]
    CMS["CMS web<br/>Admin content tools"]

    subgraph BACKEND["Backend (3-layer)"]
        CTRL["Controller layer<br/>REST endpoints, validation"]
        SVC["Service layer<br/>Business logic, geofence rules"]
        REPO["Repository layer<br/>Data access, queries"]
    end

    TR["Translate API"]
    TTS["TTS API"]
    DB[("Database<br/>POIs, users, logs")]
    FS[("File storage<br/>Audio files")]

    MOBILE --> CTRL
    CMS --> CTRL
    CTRL --> SVC
    SVC --> REPO
    SVC --> TR
    SVC --> TTS
    REPO --> DB
    REPO --> FS
```

## 4. Inside the CMS web

```mermaid
flowchart LR
    subgraph CMS["CMS web"]
        LOGIN["Login<br/>Admin authentication"]
        POI["POI manager<br/>Coordinates, audio, translations"]
        TOUR["Tour manager<br/>Ordered POI routes"]
        QRGEN["QR generator<br/>Link QR to POI"]
        DASH["Analytics dashboard<br/>Charts, heatmap, export"]
    end
    API["Backend API<br/>REST endpoints"]

    LOGIN --> API
    POI --> API
    TOUR --> API
    QRGEN --> API
    DASH --> API
```

## 5. Deployment diagram

```mermaid
flowchart TB
    subgraph PHONE["User smartphone"]
        APP["Mobile app"]
        SQLITE[("SQLite<br/>Offline content")]
    end
    subgraph ADMIN["Admin computer"]
        BROWSER["Browser<br/>CMS web"]
    end
    STOP["QR codes<br/>Bus stops"]
    subgraph SERVER["Application server"]
        API["Backend API<br/>3-layer"]
    end
    DB[("Database server")]
    FS[("File storage<br/>Audio files")]
    EXT["External APIs<br/>Translate, TTS"]

    STOP -.->|camera scan| APP
    APP --- SQLITE
    APP <-->|HTTPS| API
    BROWSER -->|HTTPS| API
    API --> DB
    API --> FS
    API --> EXT
```

## 6. ERD

```mermaid
erDiagram
    ADMIN_USER {
        int id PK
        string username
        string password_hash
    }
    POI {
        int id PK
        string name
        float latitude
        float longitude
        int radius_m
        int priority
    }
    POI_TRANSLATION {
        int id PK
        int poi_id FK
        string language_code
        text narration_text
        string audio_url
    }
    QR_CODE {
        int id PK
        int poi_id FK
        string payload
    }
    TOUR {
        int id PK
        string name
        text description
    }
    TOUR_POI {
        int tour_id PK, FK
        int poi_id PK, FK
        int visit_order
    }
    USAGE_LOG {
        int id PK
        int poi_id FK
        string session_id
        string trigger_method
        string language_code
        datetime played_at
        int listen_seconds
    }
    LOCATION_LOG {
        int id PK
        string session_id
        float latitude
        float longitude
        datetime recorded_at
    }

    ADMIN_USER ||--o{ POI : manages
    ADMIN_USER ||--o{ TOUR : manages
    POI ||--o{ POI_TRANSLATION : has
    POI ||--o{ QR_CODE : linked_to
    TOUR ||--|{ TOUR_POI : contains
    POI ||--o{ TOUR_POI : included_in
    POI ||--o{ USAGE_LOG : triggers
```
