# Procurement App

A Spring Boot application for collecting procurement information with user and admin roles.

## Features

- User registration and login with role-based access
- Users can submit purchase records with PDF invoice uploads
- Files are renamed as `item_price_date_user.pdf`
- Admin dashboard to export all records as an Excel file
- User home shows recent submissions and total value

## Build and Run

1. Install JDK 11+ and Maven.
2. From the project root run:

```bash
mvn clean package
```

3. Start the application:

```bash
java -jar target/procurement-app-0.0.1-SNAPSHOT.jar
```

4. Visit `http://localhost:8080` in your browser.

The application uses an in-memory H2 database and stores uploaded PDFs in the `uploads` directory.

## 构建与运行（中文）

1. 安装 JDK 11+ 和 Maven。
2. 在项目根目录运行：

```bash
mvn clean package
```

3. 启动应用：

```bash
java -jar target/procurement-app-0.0.1-SNAPSHOT.jar
```

4. 在浏览器访问 `http://localhost:8080`。

该应用使用内存中的 H2 数据库，并将上传的 PDF 文件存储在 `uploads` 目录。

## Default Paths

- Login: `/login`
- User home: `/user/home`
- Admin dashboard: `/admin/dashboard`
- Export Excel: `/admin/export`

A default administrator account (`admin` / `admin123`) is created on startup.
