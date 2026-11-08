package com.fileease;


import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Map;


@RestController
@RequestMapping("/api")
public class ApiController {
    public record PresetIn(@NotBlank @Size(max = 60) String name, String format, String fit,
                           Integer width, Integer height, Double minKB, Double maxKB) { }
    public record PayIn(@NotBlank @Size(max = 40) String txnId) { }

    private static final int FREE_PRESET_LIMIT = 3;
    private final UserRepo users;
    private final PresetRepo presets;
    private final PaymentRepo payments;

    public ApiController(UserRepo users, PresetRepo presets, PaymentRepo payments) {
        this.users = users; this.presets = presets; this.payments = payments;
    }

    private Models.User user(Authentication a) {
        var u = users.findById(a.getName()).orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED));
        if ("PRO".equals(u.plan) && u.proUntil != null && u.proUntil.isBefore(Instant.now())) {
            u.plan = "FREE";
            users.save(u);
        }
        return u;
    }

    @GetMapping("/me")
    public Map<String, Object> me(Authentication a) { return AuthController.view(user(a)); }

    @GetMapping("/presets")
    public List<Models.Preset> listPresets(Authentication a) { return presets.findByUserId(a.getName()); }

    @PostMapping("/presets")
    public Models.Preset addPreset(Authentication a, @Valid @RequestBody PresetIn in) {
        var u = user(a);
        if (!"PRO".equals(u.plan) && presets.countByUserId(u.id) >= FREE_PRESET_LIMIT)
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Free plan allows " + FREE_PRESET_LIMIT + " presets. Upgrade to Pro for more.");
        var p = new Models.Preset();
        p.userId = u.id; p.name = in.name().trim(); p.format = in.format(); p.fit = in.fit();
        p.width = in.width(); p.height = in.height(); p.minKB = in.minKB(); p.maxKB = in.maxKB();
        return presets.save(p);
    }


    @DeleteMapping("/presets/{id}")
    public void deletePreset(Authentication a, @PathVariable String id) {
        presets.findById(id).filter(p -> p.userId.equals(a.getName())).ifPresent(presets::delete);
    }

    @PostMapping("/payments")
    public Models.Payment submitPayment(Authentication a, @Valid @RequestBody PayIn in) {
        var u = user(a);
        String txn = in.txnId().trim();
        if (payments.existsByTxnId(txn))
            throw new ResponseStatusException(HttpStatus.CONFLICT, "This transaction ID was already submitted");
        var p = new Models.Payment();
        p.userId = u.id; p.email = u.email; p.txnId = txn;
        return payments.save(p);
    }

    @GetMapping("/payments")
    public List<Models.Payment> myPayments(Authentication a) { return payments.findByUserId(a.getName()); }

    @GetMapping("/admin/payments")
    public List<Models.Payment> pending() { return payments.findByStatus("PENDING"); }

    @PostMapping("/admin/payments/{id}/approve")
    public void approve(@PathVariable String id) {
        var p = payments.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        if (!"PENDING".equals(p.status)) throw new ResponseStatusException(HttpStatus.CONFLICT, "Already handled");
        var u = users.findById(p.userId).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        Instant base = (u.proUntil != null && u.proUntil.isAfter(Instant.now())) ? u.proUntil : Instant.now();
        u.plan = "PRO";
        u.proUntil = base.plus(30, ChronoUnit.DAYS);
        users.save(u);
        p.status = "APPROVED";
        payments.save(p);
    }

    @PostMapping("/admin/payments/{id}/reject")
    public void reject(@PathVariable String id) {
        var p = payments.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        if ("PENDING".equals(p.status)) { p.status = "REJECTED"; payments.save(p); }
    }
}

