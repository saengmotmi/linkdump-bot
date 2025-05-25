// 인터페이스와 토큰 시스템 동작 확인
import "reflect-metadata";
import { container } from "tsyringe";
import { TOKENS } from "./src/shared/interfaces/index.js";

console.log("🔧 인터페이스 & 토큰 시스템 테스트 시작...");

try {
  // 1. 토큰 정의 확인
  console.log("✅ TOKENS 객체 로드 성공");
  console.log("📋 사용 가능한 토큰들:", Object.keys(TOKENS));

  // 2. 간단한 Storage 구현체 등록 테스트
  class MockStorage {
    async save(key, data) {
      console.log(`💾 저장: ${key} = ${JSON.stringify(data)}`);
    }

    async load(key) {
      console.log(`📖 로드: ${key}`);
      return { test: "data" };
    }

    async exists(key) {
      return true;
    }

    async delete(key) {
      console.log(`🗑️ 삭제: ${key}`);
    }

    async list(prefix) {
      return ["key1", "key2"];
    }
  }

  // 3. 토큰 기반 등록
  container.register(TOKENS.Storage, { useClass: MockStorage });
  console.log("✅ Storage 서비스 등록 성공");

  // 4. 서비스 해결 및 사용
  const storage = container.resolve(TOKENS.Storage);
  await storage.save("test-key", { message: "TSyringe 동작 확인!" });
  const data = await storage.load("test-key");

  console.log("✅ Storage 서비스 동작 확인 완료");

  // 5. 설정 객체 등록 테스트
  const testConfig = {
    aiProvider: "openai",
    storageProvider: "file",
    dataPath: "./test-data",
  };

  container.register(TOKENS.Config, { useValue: testConfig });
  const config = container.resolve(TOKENS.Config);

  console.log("✅ Config 등록/해결 성공:", config.aiProvider);

  console.log("\n🎉 모든 인터페이스 & 토큰 시스템이 정상 동작합니다!");
} catch (error) {
  console.error("❌ 인터페이스 테스트 실패:", error.message);
  console.error(error.stack);
  process.exit(1);
}
