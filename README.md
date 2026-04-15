# Casette
Local streaming website that aims to provide Netflix level quality as a local media server.

Website is currently in a working state and can partially meet the goals but there are several bugs
and features that are required to provide the full quality I'd like to achieve.

### Tech Stack
| Level | Name 
| --- | --- |
| AppHost | Aspire
| Frontend | Angular
| Backend | C# + AspNetCore
| Reverse Proxy | Nginx
| Database | PostgreSql
| Storage | MinIO
| Authorization | Jwt
| Metadata | TmDB Web API

Docker Desktop is required to run Casette.
All endpoints are accessed through Nginx `http:\\\\localhost:4200`.

An account is required to access the website which can be currently access through the route
`/api/auth/create` which will create an account for you. Apply `?admin=true` to make it an
admin account. The frontend only recognises that you're an admin on login so if you change
it through the database after the fact, you will need to log out and log back in.

The frontend provides an admin section that allows you to construct metadata using TmDB identifiers.
Once an Entry Id has been created (this can be found in the route), you can use the accompanied console
(`Casette.Cli`) application to upload a video against it. Application provides `--help` to show the
two key commands you will need to interact with it.

The console application is currently going through an update and is referred to as Pencil in the project
files and will provide a higher quality experience in interacting with the backend.