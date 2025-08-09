apiVersion: apps/v1
kind: Deployment
metadata:
  annotations:
    kompose.cmd: kompose convert -f docker-compose.yaml -o k8s/
    kompose.version: 1.36.0 (ae2a39403)
  namespace: default
  labels:
    io.kompose.service: python
  name: python
spec:
  replicas: 1
  selector:
    matchLabels:
      io.kompose.service: python
  template:
    metadata:
      annotations:
        kompose.cmd: kompose convert -f docker-compose.yaml -o k8s/
        kompose.version: 1.36.0 (ae2a39403)
      labels:
        io.kompose.service: python
    spec:
      containers:
        - env:
            - name: DB_PASSWORD_FILE
              value: /app/secrets/mysql-root-password
            - name: DB_USER
              value: root
          envFrom:
            - configMapRef:
                name: env
          image: ghcr.io/chamoswor/python:${VERSION_APP}-${ARCH}
          name: python
          ports:
            - containerPort: 4840
              protocol: TCP
            - containerPort: 8000
              protocol: TCP
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
              - key: mysql-root-password
                path: mysql-root-password
