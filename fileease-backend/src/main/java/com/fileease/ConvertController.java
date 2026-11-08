package com.fileease;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;
import java.nio.file.*;
import java.time.Instant;
import java.time.LocalDate;
import java.util.*;
import java.util.concurrent.TimeUnit;
import java.util.stream.Stream;

@RestController
@RequestMapping("/api")
public class ConvertController {
    // Keep these numbers the same as frontend/src/lib/limits.js
    private static final int FREE_LIMIT = 3, PRO_LIMIT = 50;

    private final UserRepo users;
    private final String soffice;

    public ConvertController(UserRepo users, @Value("${app.soffice-path}") String soffice) {
        this.users = users;
        this.soffice = soffice;
    }

    private static void need(String name, String... exts) {
        for (String e : exts) if (name.endsWith(e)) return;
        throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Wrong file type. Expected: " + String.join(", ", exts));
    }

    @PostMapping("/convert")
    public ResponseEntity<byte[]> convert(Authentication auth, @RequestParam("file") MultipartFile file,
                                          @RequestParam("mode") String mode) throws Exception {
        var u = users.findById(auth.getName()).orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED));

        // 1. daily limit by plan
        String today = LocalDate.now().toString();
        if (!today.equals(u.convDay)) { u.convDay = today; u.convCount = 0; }
        boolean pro = "PRO".equals(u.plan) && (u.proUntil == null || u.proUntil.isAfter(Instant.now()));
        int limit = pro ? PRO_LIMIT : FREE_LIMIT;
        if (u.convCount >= limit)
            throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS,
                    "Daily limit reached (" + limit + " conversions)." + (pro ? "" : " Upgrade to Pro for more."));

        // 2. what to convert
        String name = Optional.ofNullable(file.getOriginalFilename()).orElse("file").toLowerCase();
        String target; String filter = null;
        switch (mode) {
            case "word-to-pdf" -> { need(name, ".doc", ".docx"); target = "pdf"; }
            case "excel-to-pdf" -> { need(name, ".xls", ".xlsx"); target = "pdf"; }
            case "pdf-to-word" -> { need(name, ".pdf"); target = "docx"; filter = "writer_pdf_import"; }
            default -> throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unknown conversion");
        }

        // 3. run LibreOffice in a temporary folder, then delete everything
        Path dir = Files.createTempDirectory("fileease-");
        try {
            String ext = name.substring(name.lastIndexOf('.'));
            Path in = dir.resolve("input" + ext);
            file.transferTo(in);
            List<String> cmd = new ArrayList<>(List.of(soffice, "--headless", "--norestore",
                    "-env:UserInstallation=" + dir.resolve("profile").toUri()));
            if (filter != null) cmd.add("--infilter=" + filter);
            cmd.addAll(List.of("--convert-to", target.equals("docx") ? "docx:MS Word 2007 XML" : target,
                    "--outdir", dir.toString(), in.toString()));
            Process p = new ProcessBuilder(cmd).redirectErrorStream(true)
                    .redirectOutput(ProcessBuilder.Redirect.DISCARD).start();
            if (!p.waitFor(120, TimeUnit.SECONDS)) {
                p.destroyForcibly();
                throw new ResponseStatusException(HttpStatus.GATEWAY_TIMEOUT, "Conversion took too long");
            }
            Path out = dir.resolve("input." + target);
            if (!Files.exists(out))
                throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Conversion failed. Is this file valid and not password protected?");
            byte[] bytes = Files.readAllBytes(out);
            u.convCount++;
            users.save(u);
            String base = name.substring(0, name.lastIndexOf('.'));
            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + base + "." + target + "\"")
                    .contentType(MediaType.APPLICATION_OCTET_STREAM).body(bytes);
        } finally {
            try (Stream<Path> s = Files.walk(dir)) { s.sorted(Comparator.reverseOrder()).forEach(x -> x.toFile().delete()); }
        }
    }
}
