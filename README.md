# Extension for MELCloud Homey App

![GitHub Tag](https://img.shields.io/github/v/tag/OlivierZal/com.melcloud.extension?logo=data:image/svg%2bxml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHhtbG5zOnhsaW5rPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rIiB3aWR0aD0iMTk4IiBoZWlnaHQ9IjE5OSI+CiAgICA8ZGVmcyBmaWxsPSIjZmZmIj4KICAgICAgICA8cGF0aCBkPSJNMTY5LjkyNSAxMTIuNjgxYy0xMi43MiAxOS40MDUtMzIuMTUgMzMuNzk4LTU0LjQgNDAuMzY0LTIxLjkwMiA2LjQ2LTQ2LjczIDUuNDktNjcuNDc3LTQuMzg2YTk5LjkwNSA5OS45MDUgMCAwIDEtMjYuODM0LTE4Ljc0IDEwMC4wMDYgMTAwLjAwNiAwIDAgMS0xMS42My0xMy42NWMtMS42Ni0yLjM1Mi0yLjc2NC01LjI2My0zLjg0LTcuOTJhODAuMjMzIDgwLjIzMyAwIDAgMS0yLjc5MS04LjE4OEMtMy4xNjEgNzguNTExLjMwOCA1NC42OCAxMi41MzUgMzUuNzY3IDI1LjIyOCAxNi4xMjMgNDYuNiAyLjk4IDY5Ljg0NS40NjdBODMuMTk3IDgzLjE5NyAwIDAgMSA3OS4xMSAwQzU0LjQyOCAzLjUzNyAzNC4yNjYgMjMuMDYxIDI5Ljk0NiA0Ny42MWMtMS4zNDIgNy42NDEtMS4yNzYgMTUuNDk2LjM2IDIzLjA3Mi4wNjYuNjM4LjExOSAxLjAxLjE3MiAxLjM4Mi4wOTMuNjY1LjIgMS4zNDMuMzA2IDIuMDA3LjIxMiAxLjI2My40MzggMi40OTkuODY0IDMuNzA4LS4xMi0uMzQ1LS4yNjYtLjY5LS4zODYtMS4wNSA0Ljc5OCAyMy4xNTMgMjAuMDAzIDQzLjM5NSA0MC45MjMgNTQuNDEzIDIwLjk2IDExLjA0NSA0Ni4xOTggMTIuMDgxIDY4LjA2MiAzLjAxNyAxMS40MDMtNC43MzIgMjEuNjY0LTEyLjA5NSAyOS42NzgtMjEuNDc4WiIgaWQ9ImEiIGZpbGw9IiNmZmYiLz4KICAgICAgICA8cGF0aCBkPSJtNzkuMTEgMC0uNzQuMTFDNTQuMDI2IDMuOTI4IDM0LjIyMyAyMy4zMDcgMjkuOTQ2IDQ3LjYwOWwtLjEzMy43OTJjLTEuMjAzIDcuMzkyLTEuMDg2IDE0Ljk2Ny40OTIgMjIuMjgxbC4wMjUuMjI3Yy4wNTUuNTA0LjEwMi44My4xNDggMS4xNTVsLjE0OCAxLjAwNC4xNTggMS4wMDMuMDkxLjUzNGMuMTg3IDEuMDYzLjQwMSAyLjEwNy43NTggMy4xMzJsLS4xMjMtLjMzMmMtLjA4NC0uMjIyLS4xNzEtLjQ0Ni0uMjQ4LS42NzZsLjE0Ny42OTRjNC45NTYgMjIuODYzIDIwLjA2NSA0Mi44MTEgNDAuNzc2IDUzLjcybC42My4zMjdjMjAuODM0IDEwLjczNiA0NS43ODcgMTEuNjYzIDY3LjQzMiAyLjY4OWwuNzQyLS4zMTJjMTEuMTA2LTQuNzQgMjEuMDk2LTExLjk4NyAyOC45MzYtMjEuMTY2bC0uNDIyLjYzOGMtMTIuNzI1IDE5LjA4Mi0zMS45NzMgMzMuMjMzLTUzLjk3NyAzOS43MjZsLS43MzEuMjEzYy0yMS43MjMgNi4yMjQtNDYuMjMgNS4xNjctNjYuNzQ3LTQuNTk5bC0uODk3LS40MzNhOTkuOTI0IDk5LjkyNCAwIDAgMS0yNS45MzctMTguMzA3bC0uODUtLjg0MmExMDAuMjM0IDEwMC4yMzQgMCAwIDEtMTAuNzgtMTIuODA3bC0uMzI0LS40NzhjLTEuNDgzLTIuMjYyLTIuNTExLTQuOTYzLTMuNTE2LTcuNDQ0bC0uMzk3LTEuMDA0YTgwLjU2NyA4MC41NjcgMCAwIDEtMi4zOTQtNy4xODNsLS4xODYtLjY3Qy0zLjA5IDc4LjAxOS40MzQgNTQuNDg0IDEyLjUzNiAzNS43NjZsLjM4My0uNTg3QzI1LjY1NiAxNS44NiA0Ni44MzIgMi45NTMgNjkuODQ1LjQ2NkE4Mi41MjMgODIuNTIzIDAgMCAxIDc4LjcyNCAwaC4zODVaIiBpZD0iYyIgZmlsbD0iI2ZmZiIvPgogICAgICAgIDxwYXRoIGQ9Im03OS4xMSAwLS43NC4xMUM1NC4wMjYgMy45MjggMzQuMjIzIDIzLjMwNyAyOS45NDYgNDcuNjA5bC0uMTMzLjc5MmMtMS4yMDMgNy4zOTItMS4wODYgMTQuOTY3LjQ5MiAyMi4yODFsLjAyNS4yMjhjLjA1NS41MDMuMTAyLjgyOS4xNDggMS4xNTRsLjE0OCAxLjAwNC4xNTggMS4wMDQuMDkxLjUzM2MuMTg3IDEuMDYzLjQwMSAyLjEwNy43NTggMy4xMzJsLS4xMjMtLjMzMmMtLjA4NC0uMjIyLS4xNzEtLjQ0Ni0uMjQ4LS42NzVsLjE0Ny42OTNjNC45NTYgMjIuODYzIDIwLjA2NSA0Mi44MTEgNDAuNzc2IDUzLjcybC42My4zMjhjMjAuODM0IDEwLjczNSA0NS43ODcgMTEuNjYyIDY3LjQzMiAyLjY4OGwuNzQyLS4zMTJjMTEuMTA2LTQuNzQgMjEuMDk2LTExLjk4NiAyOC45MzYtMjEuMTY2bC0uNDIyLjYzOGMtMTIuNzI1IDE5LjA4Mi0zMS45NzMgMzMuMjMzLTUzLjk3NyAzOS43MjZsLS43MzEuMjEzYy0yMS43MjMgNi4yMjQtNDYuMjMgNS4xNjctNjYuNzQ3LTQuNTk4bC0uODk3LS40MzRhOTkuOTI0IDk5LjkyNCAwIDAgMS0yNS45MzctMTguMzA3bC0uODUtLjg0MmExMDAuMjM0IDEwMC4yMzQgMCAwIDEtMTAuNzgtMTIuODA3bC0uMzI0LS40NzhjLTEuNDgzLTIuMjYyLTIuNTExLTQuOTYzLTMuNTE2LTcuNDQzbC0uMzk3LTEuMDA1YTgwLjU2NyA4MC41NjcgMCAwIDEtMi4zOTQtNy4xODNsLS4xODYtLjY3Qy0zLjA5IDc4LjAyLjQzNCA1NC40ODQgMTIuNTM2IDM1Ljc2NmwuMzgzLS41ODdDMjUuNjU2IDE1Ljg2IDQ2LjgzMiAyLjk1MyA2OS44NDUuNDY2QTgyLjUyNSA4Mi41MjUgMCAwIDEgNzguNzI0IDBoLjM4NVoiIGlkPSJlIiBmaWxsPSIjZmZmIi8+CiAgICAgICAgPHBhdGggZD0iTTkuNjUyIDEwMi42YTgxLjM2MyA4MS4zNjMgMCAwIDEgMy40ODItMTMuNzE3YzQuNTYtMTMuMDkxIDEyLjU3NC0yNC44NTMgMjMuMDYtMzMuOTE4IDExLjMyNC05LjgwOCAyNS4zNDYtMTYuMjgxIDQwLjE2NS0xOC41NGE4MC4wNSA4MC4wNSAwIDAgMSAyNi44Mi40NjVjLS4zNzItLjAyNy0uNzQ0LS4wMjctMS4xMTYtLjA1MyAzLjYwMi4xNiA3LjA4NCAxLjUyOCAxMC41NjYgMi4zNjUgMy4yMy43ODUgNi4zOCAxLjgzNSA5LjQyNCAzLjE1YTU4LjQ0IDU4LjQ0IDAgMCAxIDE2LjIyOCAxMC41YzEwLjM2NiA5LjQ3NiAxNy4wMTIgMjIuNjIgMTguNTU0IDM2LjU5YTU4LjIwOCA1OC4yMDggMCAwIDEtMi45OSAyNS42NUMxNjUuNjcyIDkyLjk3OCAxNjYuMTkgNjUuOTcgMTU1IDQzLjQ4M2MtOS43NTUtMTkuNjA0LTI3LjgwNC0zNC40MjMtNDguODU3LTQwLjQ3QTc5LjU5OCA3OS41OTggMCAwIDAgODkuNzU2LjEyN2MtMi45NS0uMTk5LTUuNzQyLS4xOTktOC42NzkuMjUzYTk2LjcxNSA5Ni43MTUgMCAwIDAtOS4wOSAxLjg3NCA5OS44MTQgOTkuODE0IDAgMCAwLTMxLjE0MSAxMy45ODJjLTkuODIyIDYuNjQ1LTE3Ljk4MyAxNS4xMzgtMjQuNTIyIDI1LjAyNkE5OS44NTkgOTkuODU5IDAgMCAwIDIuNDIyIDczLjg2NWMtNS4zOTYgMjMuNzI0LTEuNjg4IDQ5LjEyMyAxMC4yNDcgNzAuMzIxYTEwMS42MzMgMTAxLjYzMyAwIDAgMCA0LjU0NiA3LjMyNGMtNy42OTYtMTQuOTgtMTAuMjYtMzIuMzEtNy41NjMtNDguOTFaIiBpZD0iZyIgZmlsbD0iI2ZmZiIvPgogICAgICAgIDxwYXRoIGQ9Im04Ni4yNzcgMCAuODYxLjAwOWMuODYzLjAxNyAxLjczMi4wNTkgMi42MTUuMTE4bDEuMDM5LjA4YTc5LjU5OCA3OS41OTggMCAwIDEgMTUuMzQ5IDIuODA1bC42MzcuMTg2YzIwLjc3OSA2LjE2IDM4LjU2MyAyMC44NzggNDguMjIgNDAuMjg0bC4zMzIuNjc2YzEwLjg0NyAyMi4zNTIgMTAuMjIyIDQ5LjA0LTEuNDg5IDcwLjkzNWwuMjU5LS43NDZhNTguMjExIDU4LjIxMSAwIDAgMCAyLjczMi0yNC45MDVsLS4wNzYtLjY1NGMtMS42NzQtMTMuNzI1LTguMjczLTI2LjYwOC0xOC40NzgtMzUuOTM2bC0uNjAyLS41NDJhNTguNDQyIDU4LjQ0MiAwIDAgMC0xNS42MjYtOS45NThsLS45MTctLjM4N2E1OC42MjggNTguNjI4IDAgMCAwLTguNTA2LTIuNzYzbC0uNjMzLS4xNTdjLTMuMTY2LS44MTQtNi4zMzctMS45OC05LjYwNC0yLjE5bC4zOTMuMDE0LjM5NC4wMi0uOTE0LS4xNjZhODAuMDYyIDgwLjA2MiAwIDAgMC0yNS45MDctLjI5OGwtLjc4LjEyMmMtMTQuNTMgMi4zNjUtMjguMjYgOC43ODItMzkuMzg1IDE4LjQxOGwtLjU4LjUwN2MtMTAuMjAyIDguOTk0LTE4LjAwNSAyMC41NjItMjIuNDggMzMuNDExbC0uMzUxIDEuMDMzQTgxLjIzMiA4MS4yMzIgMCAwIDAgOS42NSAxMDIuNmwtLjEyMy43NzhjLTIuNDk0IDE2LjM2My4xMSAzMy4zODcgNy42ODUgNDguMTMybC0uNjg5LTEuMDI0YTEwMi4wMDYgMTAyLjAwNiAwIDAgMS0zLjg1Ny02LjNsLS4zNzgtLjY3N0M0LjMwOCAxMjkuMDY0LjEyMSAxMTIuNzE0IDAgOTYuMjk1di0xLjUyYTk3LjgyOCA5Ny44MjggMCAwIDEgMi40Mi0yMC45MWwuMjI1LS45NjVBOTkuODY3IDk5Ljg2NyAwIDAgMSAxNi4zMiA0MS4yNjJsLjUyLS43NzdjNi40NS05LjU1NyAxNC40MzgtMTcuNzc5IDI0LjAwMi0yNC4yNWwuODM5LS41NkE5OS44MzQgOTkuODM0IDAgMCAxIDcxLjk4MyAyLjI1NGwxLjI5LS4zMjJBOTYuNjU5IDk2LjY1OSAwIDAgMSA4MS4wNzMuMzggMzMuODk2IDMzLjg5NiAwIDAgMSA4Ni4yNzcgMFoiIGlkPSJpIiBmaWxsPSIjZmZmIi8+CiAgICAgICAgPHBhdGggZD0ibTg2LjI3NyAwIC44NjEuMDA5YTU1LjEzIDU1LjEzIDAgMCAxIDIuNjE1LjExOGwxLjAzOS4wOEE3OS41OTggNzkuNTk4IDAgMCAxIDEwNi4xNCAzLjAxbC42MzcuMTg2YzIwLjc4IDYuMTYyIDM4LjU2MyAyMC44NzkgNDguMjIgNDAuMjg1bC4zMzMuNjc2YzEwLjg0NyAyMi4zNTIgMTAuMjIyIDQ5LjA0LTEuNDg5IDcwLjkzNWwuMjU4LS43NDZhNTguMjExIDU4LjIxMSAwIDAgMCAyLjczMy0yNC45MDVsLS4wNzYtLjY1NWMtMS42NzUtMTMuNzI0LTguMjc0LTI2LjYwNy0xOC40NzgtMzUuOTM1bC0uNjAyLS41NDNhNTguNDQyIDU4LjQ0MiAwIDAgMC0xNS42MjctOS45NTdsLS45MTYtLjM4N2E1OC42MjggNTguNjI4IDAgMCAwLTguNTA3LTIuNzYzbC0uNjMzLS4xNTdjLTMuMTY1LS44MTQtNi4zMzYtMS45OC05LjYwMy0yLjE5bC4zOTMuMDE0LjM5NC4wMi0uOTE0LS4xNjZhODAuMDYyIDgwLjA2MiAwIDAgMC0yNS45MDctLjI5OGwtLjc4LjEyMmMtMTQuNTMgMi4zNjUtMjguMjYgOC43ODItMzkuMzg1IDE4LjQxOGwtLjU4LjUwN2MtMTAuMjAyIDguOTk0LTE4LjAwNSAyMC41NjItMjIuNDggMzMuNDExbC0uMzUyIDEuMDMzYTgxLjIzMiA4MS4yMzIgMCAwIDAtMy4xMyAxMi42ODNsLS4xMjIuNzhjLTIuNDk0IDE2LjM2Mi4xMSAzMy4zODYgNy42ODUgNDguMTNsLS42ODktMS4wMjNhMTAyLjAwNiAxMDIuMDA2IDAgMCAxLTMuODU3LTYuM2wtLjQyOS0uNzdDNC4yOTcgMTI5LjAwNi4xMjcgMTEyLjcwNCAwIDk2LjMzM3YtMS41NDRsLjAxNi0xLjE3Yy4xMy02LjYzLjkyNS0xMy4yNTQgMi40MDMtMTkuNzU0bC4yMjUtLjk2NWE5OS44NjcgOTkuODY3IDAgMCAxIDEzLjY3Ny0zMS42MzhsLjUyLS43NzdjNi40NS05LjU1NyAxNC40MzgtMTcuNzc5IDI0LjAwMi0yNC4yNWwuODM5LS41NkE5OS44MzQgOTkuODM0IDAgMCAxIDcxLjk4MyAyLjI1NGwxLjI4OS0uMzIyQTk2LjY1OSA5Ni42NTkgMCAwIDEgODEuMDc0LjM4IDMzLjg5NiAzMy44OTYgMCAwIDEgODYuMjc3IDBaIiBpZD0iayIgZmlsbD0iI2ZmZiIvPgogICAgICAgIDxwYXRoIGQ9Im01MS4zMTggMCAxLjE2Ny4wMWMyLjcyMi4wNDUgNS40NDMuMjI4IDguMTQ4LjUwOGwuNzc0LjA4NGMyMi40MzIgMi41MDcgNDMuODE0IDEyLjMyOSA1OS43OTIgMjguMzk5bC41NDUuNTU0YzE1LjIxNSAxNS41NzIgMjUuMTI0IDM1Ljg2OCAyNy43NSA1Ny41MTNsLjEzOCAxLjIwNGMuMTc0IDEuNjA2LjMxMiAzLjIxNC40MDggNC44M2wuMDI5LjUxNi4wMjQuNTE3djUuODI4bC0uMDU0IDEuMTNjLS4zMTQgNS42NTMtMS4yNCAxMS4zMjctMi40ODQgMTYuNzU3bC0uMjQ3IDEuMDM1YTk5LjgxNCA5OS44MTQgMCAwIDEtOC4xNTMgMjEuODc4bC0uMzI2LjY0Yy0xLjYzNCAzLjIxNC0zLjM4OSA2LjY4LTUuNjgyIDkuNDIxbC0uNTg5LjY5M2MtMi4xODkgMi41MjQtNC42NzYgNC44NjEtNy4xODYgNy4wNDJsLS42OTcuNmE3OS44OTQgNzkuODk0IDAgMCAxLTE4LjU3NSAxMS43NzRsLS43MjEuMzI0Yy0xMi43NyA1LjY2LTI2LjkwNiA3LjgwOC00MC43ODYgNi4yNjhsLS43NzItLjA4OWMtMTQuNjYtMS43NjYtMjguNjk1LTcuNzA0LTQwLjEyMy0xNy4wNTZsLS42Ny0uNTUzYy01LjExMi00LjI3NS05LjgzMi05LjIxNy0xMy41MzgtMTQuNzU4bC0uNTg1LS44ODNDNS4yNDQgMTM4LjU2NCAyLjI5OCAxMzIuNDUzIDAgMTI2LjU4MmwuMzU1LjY1YzQuMDc4IDcuMzQgOS44NyAxMy42ODUgMTYuNzY0IDE4LjQ3NWwuNTU1LjM4YzEyLjA4MyA4LjE3NiAyNy4xNjUgMTEuNDgyIDQxLjU3NiA5LjMyMmwuNzY2LS4xMmE1OS4zODQgNTkuMzg0IDAgMCAwIDIwLjk1Mi03LjcyMWwuODE5LS41MDJjMy41MzEtMi4yMDUgNi44MzUtNC43NzUgOS45MzMtNy41NTJsLjc4MS0uNzA3YTc4LjkwMyA3OC45MDMgMCAwIDAgNC40ODItNC40NzdsLjE4LS4yMTVjLjE5LS4yMS40MDEtLjQxMy41OS0uNjIybC4yNjMtLjI4Yy4xNzItLjE4Ny4zNC0uMzc2LjUwOS0uNTdsLjQzLS40OTZjLjI4My0uMzMzLjU1OC0uNjcuODMyLTEuMDA3bC42MzUtLjgwM2MuNDI5LS41MzMuODYzLTEuMDYyIDEuMjgtMS42MDJsLjUzMy0uNzAzYTgxLjgwNiA4MS44MDYgMCAwIDAgMS41NTMtMi4xNTVsLjY2My0uOTc0YTcwLjcyIDcwLjcyIDAgMCAwIDEuMjktMS45NzZsLjYyLTEuMDAxYy40MS0uNjcxLjgxMi0xLjM0NyAxLjIwMS0yLjAzbC41NzctMS4wMjdjLjM3OS0uNjg5Ljc0OC0xLjM4MyAxLjExMi0yLjA4M2wuNDAzLS43ODhjLjM5OS0uNzg4Ljc4My0xLjU4IDEuMTUyLTIuMzg4bC40ODMtMS4wNzFjLjMxNy0uNzE5LjYyNC0xLjQ0Ni45MjUtMi4xNzJsLjQzNC0xLjFhODIuNDQgODIuNDQgMCAwIDAgLjgyOS0yLjIxbC4zOS0xLjExNmE3NC42NyA3NC42NyAwIDAgMCAuNzI2LTIuMjQ2bC4yNTctLjg0OGMuMjUzLS44NDcuNDk0LTEuNjk3LjcxNC0yLjU1NWwuMjE2LS44NTdjLjIxMy0uODU4LjQxNS0xLjcxOC41OTQtMi41ODVsLjIzMS0xLjE1NmMuMTQ5LS43NzEuMjg4LTEuNTQyLjQyLTIuMzEzbC4xMTYtLjcxNmMzLjY5Ni0yMy42MzktMy43MzUtNDguMjUyLTE5LjkzMi02NS44N2wtLjU4NC0uNjNhNzkuNzY1IDc5Ljc2NSAwIDAgMC0yNS42OTItMTguMjNsLS45MzItLjQwNmE3OS42NTcgNzkuNjU3IDAgMCAwLTE0LjUxMi00LjYzMmwtMS4xMzUtLjIzNmE3Ni45NyA3Ni45NyAwIDAgMC02Ljg4LTEuMDY2bC0uMDY1LS4wMDdjLTEuMDA3LS4wOTMtNy44Ni0uNTA3LTguMTI3LS41bC45NTktLjEyOWMxLjkxMi0uMjc2IDMuNzk4LS42MzYgNS43MzItLjc3M0w0Ni45ODguMTJBNzIuMDkzIDcyLjA5MyAwIDAgMSA1MS4wNTYgMGguMjYyWiIgaWQ9Im0iIGZpbGw9IiNmZmYiLz4KICAgIDwvZGVmcz4KICAgIDxnIGZpbGw9Im5vbmUiIGZpbGwtcnVsZT0iZXZlbm9kZCI+CiAgICAgICAgPGcgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoMTEuODcgNDAuOTYpIj4KICAgICAgICAgICAgPG1hc2sgaWQ9ImIiIGZpbGw9IiNmZmYiPgogICAgICAgICAgICAgICAgPHVzZSB4bGluazpocmVmPSIjYSIvPgogICAgICAgICAgICA8L21hc2s+CiAgICAgICAgICAgIDxwYXRoIGZpbGw9IiNmZmYiIG1hc2s9InVybCgjYikiIGQ9Ik0tMTAtMTBoMTg5LjkyNXYxNzcuMTQzSC0xMHoiLz4KICAgICAgICA8L2c+CiAgICAgICAgPGcgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoMTEuODcgNDAuOTYyKSI+CiAgICAgICAgICAgIDxtYXNrIGlkPSJkIiBmaWxsPSIjZmZmIj4KICAgICAgICAgICAgICAgIDx1c2UgeGxpbms6aHJlZj0iI2MiLz4KICAgICAgICAgICAgPC9tYXNrPgogICAgICAgICAgICA8cGF0aCBmaWxsPSIjZmZmIiBtYXNrPSJ1cmwoI2QpIiBkPSJNLTIxLjg2Ni01MC45NjJIMTk1Ljl2MjE4LjE2NkgtMjEuODY2eiIvPgogICAgICAgIDwvZz4KICAgICAgICA8ZyB0cmFuc2Zvcm09InRyYW5zbGF0ZSgxMS44NyA0MC45NjIpIj4KICAgICAgICAgICAgPG1hc2sgaWQ9ImYiIGZpbGw9IiNmZmYiPgogICAgICAgICAgICAgICAgPHVzZSB4bGluazpocmVmPSIjZSIvPgogICAgICAgICAgICA8L21hc2s+CiAgICAgICAgICAgIDxwYXRoIGZpbGw9IiNmZmYiIG1hc2s9InVybCgjZikiIGQ9Ik0tMTAuNjY0LTEwLjY2NUgxODAuNTl2MTc4LjQ3MkgtMTAuNjY0eiIvPgogICAgICAgIDwvZz4KICAgICAgICA8ZyB0cmFuc2Zvcm09InRyYW5zbGF0ZSgwIDMuNTk0KSI+CiAgICAgICAgICAgIDxtYXNrIGlkPSJoIiBmaWxsPSIjZmZmIj4KICAgICAgICAgICAgICAgIDx1c2UgeGxpbms6aHJlZj0iI2ciLz4KICAgICAgICAgICAgPC9tYXNrPgogICAgICAgICAgICA8cGF0aCBmaWxsPSIjZmZmIiBtYXNrPSJ1cmwoI2gpIiBkPSJNLTEwLTEwaDE4My4wNjZ2MTcxLjUxSC0xMHoiLz4KICAgICAgICA8L2c+CiAgICAgICAgPGcgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoLjAwMyAzLjU5NCkiPgogICAgICAgICAgICA8bWFzayBpZD0iaiIgZmlsbD0iI2ZmZiI+CiAgICAgICAgICAgICAgICA8dXNlIHhsaW5rOmhyZWY9IiNpIi8+CiAgICAgICAgICAgIDwvbWFzaz4KICAgICAgICAgICAgPHBhdGggZmlsbD0iI2ZmZiIgbWFzaz0idXJsKCNqKSIgZD0iTS0xMC0xMy41OTRoMjE3Ljc2N3YyMTguMTY2SC0xMHoiLz4KICAgICAgICA8L2c+CiAgICAgICAgPGcgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoLjAwMyAzLjU5NCkiPgogICAgICAgICAgICA8bWFzayBpZD0ibCIgZmlsbD0iI2ZmZiI+CiAgICAgICAgICAgICAgICA8dXNlIHhsaW5rOmhyZWY9IiNrIi8+CiAgICAgICAgICAgIDwvbWFzaz4KICAgICAgICAgICAgPHBhdGggZmlsbD0iI2ZmZiIgbWFzaz0idXJsKCNsKSIgZD0iTS0xMC42NjgtMTAuNjY1aDE4NC4zOTZ2MTcyLjgzOUgtMTAuNjY4eiIvPgogICAgICAgIDwvZz4KICAgICAgICA8ZyB0cmFuc2Zvcm09InRyYW5zbGF0ZSg0Ny42NzcpIj4KICAgICAgICAgICAgPG1hc2sgaWQ9Im4iIGZpbGw9IiNmZmYiPgogICAgICAgICAgICAgICAgPHVzZSB4bGluazpocmVmPSIjbSIvPgogICAgICAgICAgICA8L21hc2s+CiAgICAgICAgICAgIDxwYXRoIGZpbGw9IiNmZmYiIG1hc2s9InVybCgjbikiIGQ9Ik0tMTAuNjY0LTEwLjY2NWgxNzEuNDgzdjE5OS4zMzhILTEwLjY2NHoiLz4KICAgICAgICA8L2c+CiAgICA8L2c+Cjwvc3ZnPgo=)
[![Homey](https://github.com/OlivierZal/com.melcloud.extension/actions/workflows/validate.yml?logo=data:image/svg%2bxml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHhtbG5zOnhsaW5rPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rIiB3aWR0aD0iMTk4IiBoZWlnaHQ9IjE5OSI+CiAgICA8ZGVmcyBmaWxsPSIjZmZmIj4KICAgICAgICA8cGF0aCBkPSJNMTY5LjkyNSAxMTIuNjgxYy0xMi43MiAxOS40MDUtMzIuMTUgMzMuNzk4LTU0LjQgNDAuMzY0LTIxLjkwMiA2LjQ2LTQ2LjczIDUuNDktNjcuNDc3LTQuMzg2YTk5LjkwNSA5OS45MDUgMCAwIDEtMjYuODM0LTE4Ljc0IDEwMC4wMDYgMTAwLjAwNiAwIDAgMS0xMS42My0xMy42NWMtMS42Ni0yLjM1Mi0yLjc2NC01LjI2My0zLjg0LTcuOTJhODAuMjMzIDgwLjIzMyAwIDAgMS0yLjc5MS04LjE4OEMtMy4xNjEgNzguNTExLjMwOCA1NC42OCAxMi41MzUgMzUuNzY3IDI1LjIyOCAxNi4xMjMgNDYuNiAyLjk4IDY5Ljg0NS40NjdBODMuMTk3IDgzLjE5NyAwIDAgMSA3OS4xMSAwQzU0LjQyOCAzLjUzNyAzNC4yNjYgMjMuMDYxIDI5Ljk0NiA0Ny42MWMtMS4zNDIgNy42NDEtMS4yNzYgMTUuNDk2LjM2IDIzLjA3Mi4wNjYuNjM4LjExOSAxLjAxLjE3MiAxLjM4Mi4wOTMuNjY1LjIgMS4zNDMuMzA2IDIuMDA3LjIxMiAxLjI2My40MzggMi40OTkuODY0IDMuNzA4LS4xMi0uMzQ1LS4yNjYtLjY5LS4zODYtMS4wNSA0Ljc5OCAyMy4xNTMgMjAuMDAzIDQzLjM5NSA0MC45MjMgNTQuNDEzIDIwLjk2IDExLjA0NSA0Ni4xOTggMTIuMDgxIDY4LjA2MiAzLjAxNyAxMS40MDMtNC43MzIgMjEuNjY0LTEyLjA5NSAyOS42NzgtMjEuNDc4WiIgaWQ9ImEiIGZpbGw9IiNmZmYiLz4KICAgICAgICA8cGF0aCBkPSJtNzkuMTEgMC0uNzQuMTFDNTQuMDI2IDMuOTI4IDM0LjIyMyAyMy4zMDcgMjkuOTQ2IDQ3LjYwOWwtLjEzMy43OTJjLTEuMjAzIDcuMzkyLTEuMDg2IDE0Ljk2Ny40OTIgMjIuMjgxbC4wMjUuMjI3Yy4wNTUuNTA0LjEwMi44My4xNDggMS4xNTVsLjE0OCAxLjAwNC4xNTggMS4wMDMuMDkxLjUzNGMuMTg3IDEuMDYzLjQwMSAyLjEwNy43NTggMy4xMzJsLS4xMjMtLjMzMmMtLjA4NC0uMjIyLS4xNzEtLjQ0Ni0uMjQ4LS42NzZsLjE0Ny42OTRjNC45NTYgMjIuODYzIDIwLjA2NSA0Mi44MTEgNDAuNzc2IDUzLjcybC42My4zMjdjMjAuODM0IDEwLjczNiA0NS43ODcgMTEuNjYzIDY3LjQzMiAyLjY4OWwuNzQyLS4zMTJjMTEuMTA2LTQuNzQgMjEuMDk2LTExLjk4NyAyOC45MzYtMjEuMTY2bC0uNDIyLjYzOGMtMTIuNzI1IDE5LjA4Mi0zMS45NzMgMzMuMjMzLTUzLjk3NyAzOS43MjZsLS43MzEuMjEzYy0yMS43MjMgNi4yMjQtNDYuMjMgNS4xNjctNjYuNzQ3LTQuNTk5bC0uODk3LS40MzNhOTkuOTI0IDk5LjkyNCAwIDAgMS0yNS45MzctMTguMzA3bC0uODUtLjg0MmExMDAuMjM0IDEwMC4yMzQgMCAwIDEtMTAuNzgtMTIuODA3bC0uMzI0LS40NzhjLTEuNDgzLTIuMjYyLTIuNTExLTQuOTYzLTMuNTE2LTcuNDQ0bC0uMzk3LTEuMDA0YTgwLjU2NyA4MC41NjcgMCAwIDEtMi4zOTQtNy4xODNsLS4xODYtLjY3Qy0zLjA5IDc4LjAxOS40MzQgNTQuNDg0IDEyLjUzNiAzNS43NjZsLjM4My0uNTg3QzI1LjY1NiAxNS44NiA0Ni44MzIgMi45NTMgNjkuODQ1LjQ2NkE4Mi41MjMgODIuNTIzIDAgMCAxIDc4LjcyNCAwaC4zODVaIiBpZD0iYyIgZmlsbD0iI2ZmZiIvPgogICAgICAgIDxwYXRoIGQ9Im03OS4xMSAwLS43NC4xMUM1NC4wMjYgMy45MjggMzQuMjIzIDIzLjMwNyAyOS45NDYgNDcuNjA5bC0uMTMzLjc5MmMtMS4yMDMgNy4zOTItMS4wODYgMTQuOTY3LjQ5MiAyMi4yODFsLjAyNS4yMjhjLjA1NS41MDMuMTAyLjgyOS4xNDggMS4xNTRsLjE0OCAxLjAwNC4xNTggMS4wMDQuMDkxLjUzM2MuMTg3IDEuMDYzLjQwMSAyLjEwNy43NTggMy4xMzJsLS4xMjMtLjMzMmMtLjA4NC0uMjIyLS4xNzEtLjQ0Ni0uMjQ4LS42NzVsLjE0Ny42OTNjNC45NTYgMjIuODYzIDIwLjA2NSA0Mi44MTEgNDAuNzc2IDUzLjcybC42My4zMjhjMjAuODM0IDEwLjczNSA0NS43ODcgMTEuNjYyIDY3LjQzMiAyLjY4OGwuNzQyLS4zMTJjMTEuMTA2LTQuNzQgMjEuMDk2LTExLjk4NiAyOC45MzYtMjEuMTY2bC0uNDIyLjYzOGMtMTIuNzI1IDE5LjA4Mi0zMS45NzMgMzMuMjMzLTUzLjk3NyAzOS43MjZsLS43MzEuMjEzYy0yMS43MjMgNi4yMjQtNDYuMjMgNS4xNjctNjYuNzQ3LTQuNTk4bC0uODk3LS40MzRhOTkuOTI0IDk5LjkyNCAwIDAgMS0yNS45MzctMTguMzA3bC0uODUtLjg0MmExMDAuMjM0IDEwMC4yMzQgMCAwIDEtMTAuNzgtMTIuODA3bC0uMzI0LS40NzhjLTEuNDgzLTIuMjYyLTIuNTExLTQuOTYzLTMuNTE2LTcuNDQzbC0uMzk3LTEuMDA1YTgwLjU2NyA4MC41NjcgMCAwIDEtMi4zOTQtNy4xODNsLS4xODYtLjY3Qy0zLjA5IDc4LjAyLjQzNCA1NC40ODQgMTIuNTM2IDM1Ljc2NmwuMzgzLS41ODdDMjUuNjU2IDE1Ljg2IDQ2LjgzMiAyLjk1MyA2OS44NDUuNDY2QTgyLjUyNSA4Mi41MjUgMCAwIDEgNzguNzI0IDBoLjM4NVoiIGlkPSJlIiBmaWxsPSIjZmZmIi8+CiAgICAgICAgPHBhdGggZD0iTTkuNjUyIDEwMi42YTgxLjM2MyA4MS4zNjMgMCAwIDEgMy40ODItMTMuNzE3YzQuNTYtMTMuMDkxIDEyLjU3NC0yNC44NTMgMjMuMDYtMzMuOTE4IDExLjMyNC05LjgwOCAyNS4zNDYtMTYuMjgxIDQwLjE2NS0xOC41NGE4MC4wNSA4MC4wNSAwIDAgMSAyNi44Mi40NjVjLS4zNzItLjAyNy0uNzQ0LS4wMjctMS4xMTYtLjA1MyAzLjYwMi4xNiA3LjA4NCAxLjUyOCAxMC41NjYgMi4zNjUgMy4yMy43ODUgNi4zOCAxLjgzNSA5LjQyNCAzLjE1YTU4LjQ0IDU4LjQ0IDAgMCAxIDE2LjIyOCAxMC41YzEwLjM2NiA5LjQ3NiAxNy4wMTIgMjIuNjIgMTguNTU0IDM2LjU5YTU4LjIwOCA1OC4yMDggMCAwIDEtMi45OSAyNS42NUMxNjUuNjcyIDkyLjk3OCAxNjYuMTkgNjUuOTcgMTU1IDQzLjQ4M2MtOS43NTUtMTkuNjA0LTI3LjgwNC0zNC40MjMtNDguODU3LTQwLjQ3QTc5LjU5OCA3OS41OTggMCAwIDAgODkuNzU2LjEyN2MtMi45NS0uMTk5LTUuNzQyLS4xOTktOC42NzkuMjUzYTk2LjcxNSA5Ni43MTUgMCAwIDAtOS4wOSAxLjg3NCA5OS44MTQgOTkuODE0IDAgMCAwLTMxLjE0MSAxMy45ODJjLTkuODIyIDYuNjQ1LTE3Ljk4MyAxNS4xMzgtMjQuNTIyIDI1LjAyNkE5OS44NTkgOTkuODU5IDAgMCAwIDIuNDIyIDczLjg2NWMtNS4zOTYgMjMuNzI0LTEuNjg4IDQ5LjEyMyAxMC4yNDcgNzAuMzIxYTEwMS42MzMgMTAxLjYzMyAwIDAgMCA0LjU0NiA3LjMyNGMtNy42OTYtMTQuOTgtMTAuMjYtMzIuMzEtNy41NjMtNDguOTFaIiBpZD0iZyIgZmlsbD0iI2ZmZiIvPgogICAgICAgIDxwYXRoIGQ9Im04Ni4yNzcgMCAuODYxLjAwOWMuODYzLjAxNyAxLjczMi4wNTkgMi42MTUuMTE4bDEuMDM5LjA4YTc5LjU5OCA3OS41OTggMCAwIDEgMTUuMzQ5IDIuODA1bC42MzcuMTg2YzIwLjc3OSA2LjE2IDM4LjU2MyAyMC44NzggNDguMjIgNDAuMjg0bC4zMzIuNjc2YzEwLjg0NyAyMi4zNTIgMTAuMjIyIDQ5LjA0LTEuNDg5IDcwLjkzNWwuMjU5LS43NDZhNTguMjExIDU4LjIxMSAwIDAgMCAyLjczMi0yNC45MDVsLS4wNzYtLjY1NGMtMS42NzQtMTMuNzI1LTguMjczLTI2LjYwOC0xOC40NzgtMzUuOTM2bC0uNjAyLS41NDJhNTguNDQyIDU4LjQ0MiAwIDAgMC0xNS42MjYtOS45NThsLS45MTctLjM4N2E1OC42MjggNTguNjI4IDAgMCAwLTguNTA2LTIuNzYzbC0uNjMzLS4xNTdjLTMuMTY2LS44MTQtNi4zMzctMS45OC05LjYwNC0yLjE5bC4zOTMuMDE0LjM5NC4wMi0uOTE0LS4xNjZhODAuMDYyIDgwLjA2MiAwIDAgMC0yNS45MDctLjI5OGwtLjc4LjEyMmMtMTQuNTMgMi4zNjUtMjguMjYgOC43ODItMzkuMzg1IDE4LjQxOGwtLjU4LjUwN2MtMTAuMjAyIDguOTk0LTE4LjAwNSAyMC41NjItMjIuNDggMzMuNDExbC0uMzUxIDEuMDMzQTgxLjIzMiA4MS4yMzIgMCAwIDAgOS42NSAxMDIuNmwtLjEyMy43NzhjLTIuNDk0IDE2LjM2My4xMSAzMy4zODcgNy42ODUgNDguMTMybC0uNjg5LTEuMDI0YTEwMi4wMDYgMTAyLjAwNiAwIDAgMS0zLjg1Ny02LjNsLS4zNzgtLjY3N0M0LjMwOCAxMjkuMDY0LjEyMSAxMTIuNzE0IDAgOTYuMjk1di0xLjUyYTk3LjgyOCA5Ny44MjggMCAwIDEgMi40Mi0yMC45MWwuMjI1LS45NjVBOTkuODY3IDk5Ljg2NyAwIDAgMSAxNi4zMiA0MS4yNjJsLjUyLS43NzdjNi40NS05LjU1NyAxNC40MzgtMTcuNzc5IDI0LjAwMi0yNC4yNWwuODM5LS41NkE5OS44MzQgOTkuODM0IDAgMCAxIDcxLjk4MyAyLjI1NGwxLjI5LS4zMjJBOTYuNjU5IDk2LjY1OSAwIDAgMSA4MS4wNzMuMzggMzMuODk2IDMzLjg5NiAwIDAgMSA4Ni4yNzcgMFoiIGlkPSJpIiBmaWxsPSIjZmZmIi8+CiAgICAgICAgPHBhdGggZD0ibTg2LjI3NyAwIC44NjEuMDA5YTU1LjEzIDU1LjEzIDAgMCAxIDIuNjE1LjExOGwxLjAzOS4wOEE3OS41OTggNzkuNTk4IDAgMCAxIDEwNi4xNCAzLjAxbC42MzcuMTg2YzIwLjc4IDYuMTYyIDM4LjU2MyAyMC44NzkgNDguMjIgNDAuMjg1bC4zMzMuNjc2YzEwLjg0NyAyMi4zNTIgMTAuMjIyIDQ5LjA0LTEuNDg5IDcwLjkzNWwuMjU4LS43NDZhNTguMjExIDU4LjIxMSAwIDAgMCAyLjczMy0yNC45MDVsLS4wNzYtLjY1NWMtMS42NzUtMTMuNzI0LTguMjc0LTI2LjYwNy0xOC40NzgtMzUuOTM1bC0uNjAyLS41NDNhNTguNDQyIDU4LjQ0MiAwIDAgMC0xNS42MjctOS45NTdsLS45MTYtLjM4N2E1OC42MjggNTguNjI4IDAgMCAwLTguNTA3LTIuNzYzbC0uNjMzLS4xNTdjLTMuMTY1LS44MTQtNi4zMzYtMS45OC05LjYwMy0yLjE5bC4zOTMuMDE0LjM5NC4wMi0uOTE0LS4xNjZhODAuMDYyIDgwLjA2MiAwIDAgMC0yNS45MDctLjI5OGwtLjc4LjEyMmMtMTQuNTMgMi4zNjUtMjguMjYgOC43ODItMzkuMzg1IDE4LjQxOGwtLjU4LjUwN2MtMTAuMjAyIDguOTk0LTE4LjAwNSAyMC41NjItMjIuNDggMzMuNDExbC0uMzUyIDEuMDMzYTgxLjIzMiA4MS4yMzIgMCAwIDAtMy4xMyAxMi42ODNsLS4xMjIuNzhjLTIuNDk0IDE2LjM2Mi4xMSAzMy4zODYgNy42ODUgNDguMTNsLS42ODktMS4wMjNhMTAyLjAwNiAxMDIuMDA2IDAgMCAxLTMuODU3LTYuM2wtLjQyOS0uNzdDNC4yOTcgMTI5LjAwNi4xMjcgMTEyLjcwNCAwIDk2LjMzM3YtMS41NDRsLjAxNi0xLjE3Yy4xMy02LjYzLjkyNS0xMy4yNTQgMi40MDMtMTkuNzU0bC4yMjUtLjk2NWE5OS44NjcgOTkuODY3IDAgMCAxIDEzLjY3Ny0zMS42MzhsLjUyLS43NzdjNi40NS05LjU1NyAxNC40MzgtMTcuNzc5IDI0LjAwMi0yNC4yNWwuODM5LS41NkE5OS44MzQgOTkuODM0IDAgMCAxIDcxLjk4MyAyLjI1NGwxLjI4OS0uMzIyQTk2LjY1OSA5Ni42NTkgMCAwIDEgODEuMDc0LjM4IDMzLjg5NiAzMy44OTYgMCAwIDEgODYuMjc3IDBaIiBpZD0iayIgZmlsbD0iI2ZmZiIvPgogICAgICAgIDxwYXRoIGQ9Im01MS4zMTggMCAxLjE2Ny4wMWMyLjcyMi4wNDUgNS40NDMuMjI4IDguMTQ4LjUwOGwuNzc0LjA4NGMyMi40MzIgMi41MDcgNDMuODE0IDEyLjMyOSA1OS43OTIgMjguMzk5bC41NDUuNTU0YzE1LjIxNSAxNS41NzIgMjUuMTI0IDM1Ljg2OCAyNy43NSA1Ny41MTNsLjEzOCAxLjIwNGMuMTc0IDEuNjA2LjMxMiAzLjIxNC40MDggNC44M2wuMDI5LjUxNi4wMjQuNTE3djUuODI4bC0uMDU0IDEuMTNjLS4zMTQgNS42NTMtMS4yNCAxMS4zMjctMi40ODQgMTYuNzU3bC0uMjQ3IDEuMDM1YTk5LjgxNCA5OS44MTQgMCAwIDEtOC4xNTMgMjEuODc4bC0uMzI2LjY0Yy0xLjYzNCAzLjIxNC0zLjM4OSA2LjY4LTUuNjgyIDkuNDIxbC0uNTg5LjY5M2MtMi4xODkgMi41MjQtNC42NzYgNC44NjEtNy4xODYgNy4wNDJsLS42OTcuNmE3OS44OTQgNzkuODk0IDAgMCAxLTE4LjU3NSAxMS43NzRsLS43MjEuMzI0Yy0xMi43NyA1LjY2LTI2LjkwNiA3LjgwOC00MC43ODYgNi4yNjhsLS43NzItLjA4OWMtMTQuNjYtMS43NjYtMjguNjk1LTcuNzA0LTQwLjEyMy0xNy4wNTZsLS42Ny0uNTUzYy01LjExMi00LjI3NS05LjgzMi05LjIxNy0xMy41MzgtMTQuNzU4bC0uNTg1LS44ODNDNS4yNDQgMTM4LjU2NCAyLjI5OCAxMzIuNDUzIDAgMTI2LjU4MmwuMzU1LjY1YzQuMDc4IDcuMzQgOS44NyAxMy42ODUgMTYuNzY0IDE4LjQ3NWwuNTU1LjM4YzEyLjA4MyA4LjE3NiAyNy4xNjUgMTEuNDgyIDQxLjU3NiA5LjMyMmwuNzY2LS4xMmE1OS4zODQgNTkuMzg0IDAgMCAwIDIwLjk1Mi03LjcyMWwuODE5LS41MDJjMy41MzEtMi4yMDUgNi44MzUtNC43NzUgOS45MzMtNy41NTJsLjc4MS0uNzA3YTc4LjkwMyA3OC45MDMgMCAwIDAgNC40ODItNC40NzdsLjE4LS4yMTVjLjE5LS4yMS40MDEtLjQxMy41OS0uNjIybC4yNjMtLjI4Yy4xNzItLjE4Ny4zNC0uMzc2LjUwOS0uNTdsLjQzLS40OTZjLjI4My0uMzMzLjU1OC0uNjcuODMyLTEuMDA3bC42MzUtLjgwM2MuNDI5LS41MzMuODYzLTEuMDYyIDEuMjgtMS42MDJsLjUzMy0uNzAzYTgxLjgwNiA4MS44MDYgMCAwIDAgMS41NTMtMi4xNTVsLjY2My0uOTc0YTcwLjcyIDcwLjcyIDAgMCAwIDEuMjktMS45NzZsLjYyLTEuMDAxYy40MS0uNjcxLjgxMi0xLjM0NyAxLjIwMS0yLjAzbC41NzctMS4wMjdjLjM3OS0uNjg5Ljc0OC0xLjM4MyAxLjExMi0yLjA4M2wuNDAzLS43ODhjLjM5OS0uNzg4Ljc4My0xLjU4IDEuMTUyLTIuMzg4bC40ODMtMS4wNzFjLjMxNy0uNzE5LjYyNC0xLjQ0Ni45MjUtMi4xNzJsLjQzNC0xLjFhODIuNDQgODIuNDQgMCAwIDAgLjgyOS0yLjIxbC4zOS0xLjExNmE3NC42NyA3NC42NyAwIDAgMCAuNzI2LTIuMjQ2bC4yNTctLjg0OGMuMjUzLS44NDcuNDk0LTEuNjk3LjcxNC0yLjU1NWwuMjE2LS44NTdjLjIxMy0uODU4LjQxNS0xLjcxOC41OTQtMi41ODVsLjIzMS0xLjE1NmMuMTQ5LS43NzEuMjg4LTEuNTQyLjQyLTIuMzEzbC4xMTYtLjcxNmMzLjY5Ni0yMy42MzktMy43MzUtNDguMjUyLTE5LjkzMi02NS44N2wtLjU4NC0uNjNhNzkuNzY1IDc5Ljc2NSAwIDAgMC0yNS42OTItMTguMjNsLS45MzItLjQwNmE3OS42NTcgNzkuNjU3IDAgMCAwLTE0LjUxMi00LjYzMmwtMS4xMzUtLjIzNmE3Ni45NyA3Ni45NyAwIDAgMC02Ljg4LTEuMDY2bC0uMDY1LS4wMDdjLTEuMDA3LS4wOTMtNy44Ni0uNTA3LTguMTI3LS41bC45NTktLjEyOWMxLjkxMi0uMjc2IDMuNzk4LS42MzYgNS43MzItLjc3M0w0Ni45ODguMTJBNzIuMDkzIDcyLjA5MyAwIDAgMSA1MS4wNTYgMGguMjYyWiIgaWQ9Im0iIGZpbGw9IiNmZmYiLz4KICAgIDwvZGVmcz4KICAgIDxnIGZpbGw9Im5vbmUiIGZpbGwtcnVsZT0iZXZlbm9kZCI+CiAgICAgICAgPGcgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoMTEuODcgNDAuOTYpIj4KICAgICAgICAgICAgPG1hc2sgaWQ9ImIiIGZpbGw9IiNmZmYiPgogICAgICAgICAgICAgICAgPHVzZSB4bGluazpocmVmPSIjYSIvPgogICAgICAgICAgICA8L21hc2s+CiAgICAgICAgICAgIDxwYXRoIGZpbGw9IiNmZmYiIG1hc2s9InVybCgjYikiIGQ9Ik0tMTAtMTBoMTg5LjkyNXYxNzcuMTQzSC0xMHoiLz4KICAgICAgICA8L2c+CiAgICAgICAgPGcgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoMTEuODcgNDAuOTYyKSI+CiAgICAgICAgICAgIDxtYXNrIGlkPSJkIiBmaWxsPSIjZmZmIj4KICAgICAgICAgICAgICAgIDx1c2UgeGxpbms6aHJlZj0iI2MiLz4KICAgICAgICAgICAgPC9tYXNrPgogICAgICAgICAgICA8cGF0aCBmaWxsPSIjZmZmIiBtYXNrPSJ1cmwoI2QpIiBkPSJNLTIxLjg2Ni01MC45NjJIMTk1Ljl2MjE4LjE2NkgtMjEuODY2eiIvPgogICAgICAgIDwvZz4KICAgICAgICA8ZyB0cmFuc2Zvcm09InRyYW5zbGF0ZSgxMS44NyA0MC45NjIpIj4KICAgICAgICAgICAgPG1hc2sgaWQ9ImYiIGZpbGw9IiNmZmYiPgogICAgICAgICAgICAgICAgPHVzZSB4bGluazpocmVmPSIjZSIvPgogICAgICAgICAgICA8L21hc2s+CiAgICAgICAgICAgIDxwYXRoIGZpbGw9IiNmZmYiIG1hc2s9InVybCgjZikiIGQ9Ik0tMTAuNjY0LTEwLjY2NUgxODAuNTl2MTc4LjQ3MkgtMTAuNjY0eiIvPgogICAgICAgIDwvZz4KICAgICAgICA8ZyB0cmFuc2Zvcm09InRyYW5zbGF0ZSgwIDMuNTk0KSI+CiAgICAgICAgICAgIDxtYXNrIGlkPSJoIiBmaWxsPSIjZmZmIj4KICAgICAgICAgICAgICAgIDx1c2UgeGxpbms6aHJlZj0iI2ciLz4KICAgICAgICAgICAgPC9tYXNrPgogICAgICAgICAgICA8cGF0aCBmaWxsPSIjZmZmIiBtYXNrPSJ1cmwoI2gpIiBkPSJNLTEwLTEwaDE4My4wNjZ2MTcxLjUxSC0xMHoiLz4KICAgICAgICA8L2c+CiAgICAgICAgPGcgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoLjAwMyAzLjU5NCkiPgogICAgICAgICAgICA8bWFzayBpZD0iaiIgZmlsbD0iI2ZmZiI+CiAgICAgICAgICAgICAgICA8dXNlIHhsaW5rOmhyZWY9IiNpIi8+CiAgICAgICAgICAgIDwvbWFzaz4KICAgICAgICAgICAgPHBhdGggZmlsbD0iI2ZmZiIgbWFzaz0idXJsKCNqKSIgZD0iTS0xMC0xMy41OTRoMjE3Ljc2N3YyMTguMTY2SC0xMHoiLz4KICAgICAgICA8L2c+CiAgICAgICAgPGcgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoLjAwMyAzLjU5NCkiPgogICAgICAgICAgICA8bWFzayBpZD0ibCIgZmlsbD0iI2ZmZiI+CiAgICAgICAgICAgICAgICA8dXNlIHhsaW5rOmhyZWY9IiNrIi8+CiAgICAgICAgICAgIDwvbWFzaz4KICAgICAgICAgICAgPHBhdGggZmlsbD0iI2ZmZiIgbWFzaz0idXJsKCNsKSIgZD0iTS0xMC42NjgtMTAuNjY1aDE4NC4zOTZ2MTcyLjgzOUgtMTAuNjY4eiIvPgogICAgICAgIDwvZz4KICAgICAgICA8ZyB0cmFuc2Zvcm09InRyYW5zbGF0ZSg0Ny42NzcpIj4KICAgICAgICAgICAgPG1hc2sgaWQ9Im4iIGZpbGw9IiNmZmYiPgogICAgICAgICAgICAgICAgPHVzZSB4bGluazpocmVmPSIjbSIvPgogICAgICAgICAgICA8L21hc2s+CiAgICAgICAgICAgIDxwYXRoIGZpbGw9IiNmZmYiIG1hc2s9InVybCgjbikiIGQ9Ik0tMTAuNjY0LTEwLjY2NWgxNzEuNDgzdjE5OS4zMzhILTEwLjY2NHoiLz4KICAgICAgICA8L2c+CiAgICA8L2c+Cjwvc3ZnPgo=)](https://github.com/OlivierZal/com.melcloud.extension/actions/workflows/validate.yml)
[![CodeQL](https://github.com/OlivierZal/com.melcloud.extension/actions/workflows/github-code-scanning/codeql/badge.svg)](https://github.com/OlivierZal/com.melcloud.extension/actions/workflows/github-code-scanning/codeql)
[![Quality Gate Status](https://sonarcloud.io/api/project_badges/measure?project=OlivierZal_com.melcloud.extension&metric=alert_status)](https://sonarcloud.io/summary/new_code?id=OlivierZal_com.melcloud.extension)

## Introduction

This app extends the MELCloud Homey app by auto-adjusting your air-to-air devices to maintain a cooling temperature within 8 °C of the outdoor temperature.

Why?

- Because it's better for your heat pumps.
- Because it's better for your health.
- Because it's better for the environment.

## Usage

1. You must have a Homey Pro.
2. Install the [MELCloud Homey app](https://homey.app/a/com.mecloud) from the Homey App Store.
3. Pair your devices.
4. Install the [MELCloud Homey app extension](https://homey.app/a/com.mecloud.extension) from the Homey App Store.
5. Configure your outdoor temperature source in the settings of the MELCloud Homey app extension.
