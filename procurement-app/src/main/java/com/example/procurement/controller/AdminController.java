package com.example.procurement.controller;

import com.example.procurement.service.ExportService;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

import javax.servlet.http.HttpServletResponse;
import java.io.IOException;

@Controller
public class AdminController {

    private final ExportService exportService;

    public AdminController(ExportService exportService) {
        this.exportService = exportService;
    }

    @GetMapping("/admin/export")
    public void export(HttpServletResponse response) throws IOException {
        exportService.exportAll(response);
    }

    @GetMapping("/admin/dashboard")
    public String dashboard() {
        return "admin/dashboard";
    }
}
