apiVersion: apps/v1
kind: Deployment
metadata:
  name: nginx
  labels:
    io.kompose.service: nginx
  annotations:
    kompose.cmd: kompose convert -f docker-compose.yaml -o k8s/
    kompose.version: 1.36.0 (ae2a39403)
spec:
  replicas: 1
  strategy:
    type: Recreate
  selector:
    matchLabels:
      io.kompose.service: nginx
  template:
    metadata:
      labels:
        io.kompose.service: nginx
      annotations:
        kompose.cmd: kompose convert -f docker-compose.yaml -o k8s/
        kompose.version: 1.36.0 (ae2a39403)
    spec:
      restartPolicy: Always
      containers:
        - name: nginx
          image: ghcr.io/chamoswor/nginx:${VERSION_APP}-${ARCH}
          imagePullPolicy: Always
          envFrom:
            - configMapRef:
                name: env
          ports:
            - containerPort: 80
              protocol: TCP
            - containerPort: 443
              protocol: TCP
          volumeMounts:
            - name: nginx-cm0
              mountPath: /etc/nginx/templates
              readOnly: true
            - name: ssl
              mountPath: /etc/nginx/ssl
            - name: nginx-claim2
              mountPath: /usr/share/nginx/html
      volumes:
        - name: nginx-cm0
          configMap:
            name: nginx-cm0
        - name: ssl
          emptyDir: {}
        - name: nginx-claim2
          persistentVolumeClaim:
            claimName: nginx-claim2
