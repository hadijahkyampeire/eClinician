.PHONY: install run backend frontend clean

install:
	cd frontend && npm install
	cd backend && ./mvnw clean install

backend:
	cd backend && ./mvnw spring-boot:run

frontend:
	cd frontend && npm run dev

run:
	@echo "Starting backend..."
	(cd backend && ./mvnw spring-boot:run) & \
	BACKEND_PID=$$!; \
	echo "Waiting up to 30s for backend..."; \
	for i in $$(seq 1 30); do \
		curl -sf http://localhost:8080/api/health >/dev/null 2>&1 && { echo "Backend is up."; break; }; \
		kill -0 $$BACKEND_PID 2>/dev/null || { echo "Backend exited — check logs above."; break; }; \
		sleep 1; \
	done; \
	echo "Starting frontend..."; \
	(cd frontend && npm run dev); \
	wait

test:
	cd backend && ./mvnw test

lint:
	cd frontend && npm run lint

format:
	cd frontend && npm run format || true

clean:
	cd backend && ./mvnw clean
	cd frontend && npm run clean
