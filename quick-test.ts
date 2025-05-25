import "reflect-metadata";
import { container } from "tsyringe";

// 간단한 서비스 인터페이스
interface GreetingService {
  greet(name: string): string;
}

// 구현체
class SimpleGreetingService implements GreetingService {
  greet(name: string): string {
    return `🚀 안녕하세요, ${name}님! TSX로 TypeScript가 직접 실행되고 있습니다!`;
  }
}

// TSyringe 컨테이너 등록
container.register<GreetingService>("GreetingService", {
  useClass: SimpleGreetingService,
});

// 실행
console.log("=".repeat(60));
console.log("🎉 LinkDump Bot - TSX 데모 실행 중...");
console.log("=".repeat(60));

const greetingService = container.resolve<GreetingService>("GreetingService");
console.log(greetingService.greet("개발자"));

console.log("\n✅ TSX 설정 완료!");
console.log("✅ TypeScript 네이티브 실행 성공!");
console.log("✅ TSyringe 의존성 주입 동작 확인!");
console.log("✅ reflect-metadata 정상 로드!");

console.log("\n📊 시스템 정보:");
console.log(`- Node.js 버전: ${process.version}`);
console.log(`- 실행 시간: ${new Date().toISOString()}`);
console.log(
  `- 메모리 사용량: ${Math.round(
    process.memoryUsage().heapUsed / 1024 / 1024
  )}MB`
);

console.log("\n🎯 다음 단계:");
console.log("1. npm run dev - 개발 서버 시작 (watch 모드)");
console.log("2. npm run start - 프로덕션 실행");
console.log("3. npm run check:types - 타입 체크");

console.log("\n" + "=".repeat(60));
