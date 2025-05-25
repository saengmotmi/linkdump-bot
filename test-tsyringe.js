// TSyringe 시스템 동작 확인 테스트
import "reflect-metadata";
import { container } from "tsyringe";

console.log("🚀 TSyringe 동작 테스트 시작...");

try {
  // 1. 기본 TSyringe 동작 확인
  console.log("✅ TSyringe import 성공");

  // 2. 간단한 서비스 등록 및 해결 테스트
  class TestService {
    getMessage() {
      return "TSyringe가 정상 동작합니다!";
    }
  }

  container.register("TestService", { useClass: TestService });
  const testService = container.resolve("TestService");

  console.log("✅ 서비스 등록/해결 성공:", testService.getMessage());

  // 3. 인터페이스 토큰 테스트
  const testToken = Symbol.for("TestToken");
  container.register(testToken, { useValue: "토큰 기반 등록 성공!" });
  const tokenValue = container.resolve(testToken);

  console.log("✅ 토큰 기반 등록/해결 성공:", tokenValue);

  console.log("\n🎉 모든 TSyringe 기본 기능이 정상 동작합니다!");
} catch (error) {
  console.error("❌ TSyringe 테스트 실패:", error.message);
  process.exit(1);
}
