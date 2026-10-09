# ASP.NET Core & EF Core Architectural Study (CO4)

This self-learning study explores the enterprise capabilities of **.NET 8/9 Core Web API** compared with **Java Spring Boot**, **Python FastAPI**, and **Node.js Express**.

---

## 1. Multi-Framework Comparison Matrix

| Architectural Feature | ASP.NET Core 8 | Spring Boot 3.5 | FastAPI | Node.js Express |
| :--- | :--- | :--- | :--- | :--- |
| **Language & Runtime** | C# on .NET CLR / JIT | Java 17/21 on OpenJDK / HotSpot | Python 3.11+ / CPython | JavaScript/TypeScript on V8 |
| **Dependency Injection** | Native built-in IoC Container (`IServiceCollection`) | Spring IoC / ApplicationContext (`@Autowired`) | FastAPI `Depends()` function injection | None native (Inversify / Awilix) |
| **Primary ORM** | Entity Framework Core (EF Core) | Spring Data JPA / Hibernate | SQLAlchemy / Tortoise | Sequelize / Mongoose / Prisma |
| **Threading Model** | Thread Pool + async/await Tasks | Thread-per-request / Virtual Threads | Single-thread async event loop | Single-thread async event loop |
| **Security Framework** | ASP.NET Core Identity & JWT Bearer | Spring Security 6 & Filters | OAuth2 Password Bearer & JWT | Passport.js & custom middleware |
| **API Documentation** | Swashbuckle / Microsoft.OpenApi | SpringDoc OpenAPI UI | Native OpenAPI 3.0 via Pydantic | swagger-ui-express / manual |

---

## 2. Key Highlights of .NET Core

1. **Kestrel High-Performance Web Server**: Kestrel is among the fastest web servers in independent TechEmpower benchmarks, achieving millions of requests per second for JSON serialization.
2. **First-Class LINQ (Language Integrated Query)**: EF Core translates strongly-typed C# expressions (`context.Routes.Where(r => r.DistanceKm > 10).ToListAsync()`) into optimized SQL queries at compile and run time.
3. **Dependency Injection Lifetimes**:
   - **Transient**: Created each time requested (`AddTransient<IEngine, RouteEngine>()`).
   - **Scoped**: Created once per client HTTP request (`AddScoped<AppDbContext>()`).
   - **Singleton**: Created once on application startup (`AddSingleton<ICache, MemoryCache>()`).
