apiVersion: apps/v1
kind: Deployment
metadata:
  name: frontend
  namespace: default
  labels:
    io.kompose.service: frontend
spec:
  replicas: 1
  selector:
    matchLabels:
      io.kompose.service: frontend
  template:
    metadata:
      labels:
        io.kompose.service: frontend
    spec:
      containers:
        - name: frontend
          image: ghcr.io/chamoswor/frontend:${VERSION_APP}-${ARCH}
          imagePullPolicy: Always
          volumeMounts:
            - name: frontend-nginx-config
              mountPath: /etc/nginx/conf.d/default.conf
              subPath: default.conf
          ports:
            - containerPort: 80
          envFrom:
            - configMapRef:
                name: env
      volumes:
        - name: frontend-nginx-config
          configMap:
            name: frontend-nginx-config
            items:
              - key: default.conf
                path: default.conf
      restartPolicy: Always
      
