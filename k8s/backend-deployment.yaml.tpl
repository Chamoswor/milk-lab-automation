apiVersion: apps/v1
kind: Deployment
metadata:
  annotations:
    kompose.cmd: kompose convert -f docker-compose.yaml -o k8s/
    kompose.version: 1.36.0 (ae2a39403)
  namespace: default
  labels:
    io.kompose.service: backend
  name: backend
spec:
  replicas: 1
  selector:
    matchLabels:
      io.kompose.service: backend
  template:
    metadata:
      annotations:
        kompose.cmd: kompose convert -f docker-compose.yaml -o k8s/
        kompose.version: 1.36.0 (ae2a39403)
      labels:
        io.kompose.service: backend
    spec:
      containers:
        - name: backend
          image: ghcr.io/chamoswor/backend:${VERSION_APP}-${ARCH}
          imagePullPolicy: Always
          ports:
            - containerPort: 3000
              protocol: TCP
          env:
            - name: ADMIN_PASSWORD_FILE
              value: /app/secrets/admin-password
            - name: SESSION_SECRET_FILE
              value: /app/secrets/session-secret

            - name: DB_HOST
              valueFrom:
                configMapKeyRef:
                  name: env
                  key: DB_HOST
            - name: DB_USER
              valueFrom:
                configMapKeyRef:
                  name: env
                  key: DB_USER
            - name: DB_NAME
              valueFrom:
                configMapKeyRef:
                  name: env
                  key: DB_NAME

            - name: DB_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: ${secrets_name}
                  key: db-password

          volumeMounts:
            - name: ${secrets_name}
              mountPath: /app/secrets
              readOnly: true

      restartPolicy: Always
      volumes:
        - name: ${secrets_name}
          secret:
            secretName: ${secrets_name}
            items:
              - key: db-password
                path: db-password
              - key: session-secret
                path: session-secret
              - key: admin-password
                path: admin-password
