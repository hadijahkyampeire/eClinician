.PHONY: install run backend frontend test test-report lint format clean

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

# The same run, with Spring's start-up logging filtered out so the result fits on one
# screen. The output is Maven's own, unedited — only the noise around it is dropped — and
# the exit code is still the suite's, so a failure here is a failure.
test-report:
	@cd backend && ./mvnw test > target/test-run.log 2>&1; status=$$?; \
	echo ""; \
	grep -E "^\[(INFO|ERROR)\] (Tests run:|Results:|BUILD|Total time)|<<< (FAILURE|ERROR)" target/test-run.log; \
	echo ""; \
	[ $$status -eq 0 ] || echo "See backend/target/test-run.log for the failure."; \
	exit $$status

lint:
	cd frontend && npm run lint

format:
	cd frontend && npm run format || true

clean:
	cd backend && ./mvnw clean
	cd frontend && npm run clean
