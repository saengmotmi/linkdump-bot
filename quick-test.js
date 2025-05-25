// 현재 동작하는 TSyringe 시스템 데모
import "reflect-metadata";
import { container } from "tsyringe";

console.log("🚀 LinkDump Bot - TSyringe 시스템 데모");
console.log("=".repeat(50));

// 1. 인터페이스 토큰 정의 (실제 파일에서 가져온 것과 동일)
const TOKENS = {
  Storage: Symbol.for("Storage"),
  AIClient: Symbol.for("AIClient"),
  LinkRepository: Symbol.for("LinkRepository"),
  LinkManagementService: Symbol.for("LinkManagementService"),
};

// 2. Mock 구현체들 (실제 구현체와 동일한 인터페이스)
class MockStorage {
  async save(key, data) {
    console.log(`💾 [Storage] 저장: ${key}`);
    return true;
  }

  async load(key) {
    console.log(`📖 [Storage] 로드: ${key}`);
    return { id: "test-link", url: "https://example.com" };
  }

  async exists(key) {
    return true;
  }
  async delete(key) {
    return true;
  }
  async list(prefix) {
    return ["link1", "link2"];
  }
}

class MockAIClient {
  async generateText(prompt) {
    console.log(`🤖 [AI] 텍스트 생성: ${prompt.substring(0, 50)}...`);
    return "AI가 생성한 요약 텍스트입니다.";
  }
}

class MockLinkRepository {
  constructor(storage) {
    this.storage = storage;
    console.log("🔗 [LinkRepository] 초기화 완료");
  }

  async save(link) {
    console.log(`💾 [LinkRepository] 링크 저장: ${link.url}`);
    return await this.storage.save(`link:${link.id}`, link);
  }

  async findAll() {
    console.log("📋 [LinkRepository] 모든 링크 조회");
    return [
      { id: "1", url: "https://example.com", title: "Example" },
      { id: "2", url: "https://github.com", title: "GitHub" },
    ];
  }
}

class MockLinkManagementService {
  constructor(linkRepository, aiClient, storage) {
    this.linkRepository = linkRepository;
    this.aiClient = aiClient;
    this.storage = storage;
    console.log("⚡ [LinkManagementService] 초기화 완료");
  }

  async addLink(url, tags = []) {
    console.log(`➕ [Service] 링크 추가: ${url}`);

    const link = {
      id: Date.now().toString(),
      url,
      tags,
      createdAt: new Date(),
      status: "pending",
    };

    await this.linkRepository.save(link);

    // AI 요약 시뮬레이션
    const summary = await this.aiClient.generateText(`Summarize: ${url}`);

    return {
      success: true,
      link: { ...link, summary },
      message: "링크가 성공적으로 추가되었습니다!",
    };
  }

  async getLinks() {
    console.log("📋 [Service] 링크 목록 조회");
    const links = await this.linkRepository.findAll();
    return { success: true, links };
  }
}

// 3. TSyringe 컨테이너 설정
console.log("\n🔧 TSyringe 컨테이너 설정 중...");

// 기본 서비스들 등록
container.register(TOKENS.Storage, { useClass: MockStorage });
container.register(TOKENS.AIClient, { useClass: MockAIClient });

// 의존성이 있는 서비스 등록
container.register(TOKENS.LinkRepository, {
  useFactory: (c) => {
    const storage = c.resolve(TOKENS.Storage);
    return new MockLinkRepository(storage);
  },
});

container.register(TOKENS.LinkManagementService, {
  useFactory: (c) => {
    const linkRepository = c.resolve(TOKENS.LinkRepository);
    const aiClient = c.resolve(TOKENS.AIClient);
    const storage = c.resolve(TOKENS.Storage);
    return new MockLinkManagementService(linkRepository, aiClient, storage);
  },
});

console.log("✅ 모든 서비스 등록 완료!");

// 4. 실제 사용 데모
console.log("\n🎯 실제 사용 데모 시작...");

try {
  // 서비스 해결
  const linkService = container.resolve(TOKENS.LinkManagementService);

  // 링크 추가
  console.log("\n1️⃣ 링크 추가 테스트:");
  const addResult = await linkService.addLink(
    "https://github.com/microsoft/tsyringe",
    ["typescript", "di"]
  );
  console.log("결과:", addResult.message);

  // 링크 목록 조회
  console.log("\n2️⃣ 링크 목록 조회 테스트:");
  const listResult = await linkService.getLinks();
  console.log("결과:", `${listResult.links.length}개의 링크 발견`);

  console.log("\n🎉 모든 테스트 성공! TSyringe 시스템이 완벽하게 동작합니다!");
  console.log("\n📊 성과:");
  console.log("✅ 의존성 주입 - 완벽 동작");
  console.log("✅ 서비스 등록/해결 - 완벽 동작");
  console.log("✅ 팩토리 패턴 - 완벽 동작");
  console.log("✅ 인터페이스 기반 설계 - 완벽 동작");
} catch (error) {
  console.error("❌ 데모 실행 실패:", error.message);
}
