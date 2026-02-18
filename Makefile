.PHONY: verify verify-web verify-remake-web

verify: verify-web verify-remake-web

verify-web:
	npm --prefix apps/web ci
	npm --prefix apps/web run lint
	npm --prefix apps/web run format:check
	npm --prefix apps/web run build
	npm --prefix apps/web run test:smoke

verify-remake-web:
	npm --prefix apps/remake-web ci
	npm --prefix apps/remake-web run lint
	npm --prefix apps/remake-web run format:check
	npm --prefix apps/remake-web run build
	npm --prefix apps/remake-web run test:smoke
